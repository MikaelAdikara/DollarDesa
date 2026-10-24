import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow, PHASE_STYLE, StatusPill, fmtIp } from "@/components/ui";
import { Tour } from "@/components/tour";
import { fmtClock } from "@/lib/pilot/clock";
import { PHASE_LABEL } from "@/lib/pilot/engine";
import { PROVINCES, type ProvinceId } from "@/lib/pilot/reference";
import { dayContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "Sekolah & orang tua" };
export const dynamic = "force-dynamic";

export default async function SekolahIndex({ searchParams }: { searchParams: Promise<{ t?: string; prov?: string; reg?: string; q?: string }> }) {
  const sp = await searchParams;
  const prov = (PROVINCES.find((p) => p.id === sp.prov)?.id ?? "DIY") as ProvinceId;
  const province = PROVINCES.find((p) => p.id === prov)!;
  const reg = province.regencies.find((r) => r.id === sp.reg)?.id ?? province.regencies[0].id;
  const { states } = await dayContext(sp.t, { province: prov, regency: reg });
  const q = (sp.q ?? "").toLowerCase().trim();
  const rows = states.filter((s) => !q || s.batch.school.name.toLowerCase().includes(q)).sort((a, b) => a.batch.school.name.localeCompare(b.batch.school.name, "id"));
  const tq = sp.t ? `t=${encodeURIComponent(sp.t)}&` : "";
  const tOnly = sp.t ? `?t=${encodeURIComponent(sp.t)}` : "";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <Eyebrow>Portal sekolah & orang tua</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Cek makanan hari ini di sekolahmu.</h1>
      <p className="mt-3 max-w-2xl text-ink-2">
        Cara tercepat: pindai QR pada label boks MBG. Kalau labelnya tidak ada, cari nama sekolah di bawah. Status diperbarui setiap kali dapur atau guru piket mencatat suhu.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {PROVINCES.map((p) => (
          <Link key={p.id} href={`/sekolah?${tq}prov=${p.id}`} className={`rounded-xl px-4 py-2 text-sm font-semibold ${p.id === prov ? "bg-ink text-white" : "bg-white text-ink-2"}`}>
            {p.short}
          </Link>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {province.regencies.map((r) => (
          <Link key={r.id} href={`/sekolah?${tq}prov=${prov}&reg=${r.id}`} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${reg === r.id ? "bg-daun text-white" : "bg-white/70 text-ink-2"}`}>
            {r.name}
          </Link>
        ))}
      </div>
      <form data-tour="search" className="mt-4 flex max-w-md gap-2" action="/sekolah">
        {sp.t ? <input type="hidden" name="t" value={sp.t} /> : null}
        <input type="hidden" name="prov" value={prov} />
        <input type="hidden" name="reg" value={reg} />
        <label htmlFor="q" className="sr-only">Nama sekolah</label>
        <input id="q" name="q" defaultValue={sp.q} placeholder="Contoh: SDN 2 Depok" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" />
        <button className="rounded-xl bg-daun px-4 text-sm font-semibold text-white">Cari</button>
      </form>

      <ul data-tour="list" className="mt-6 grid gap-2">
        {rows.slice(0, 60).map((s) => (
          <li key={s.id}>
            <Link href={`/cek/${s.id}${tOnly}`} className="card flex items-center justify-between gap-3 px-4 py-3 hover:border-daun">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{s.batch.school.name}</span>
                <span className="block truncate text-xs text-muted">
                  dari {s.batch.kitchen.name} · makan {fmtClock(s.batch.mealAt, s.batch.tzOffset)} {s.province.tzLabel}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`hidden rounded-md px-2 py-0.5 text-[11px] font-semibold sm:inline ${PHASE_STYLE[s.phase]}`}>{PHASE_LABEL[s.phase]}</span>
                <span className="font-mono text-xs text-muted tnum">{fmtIp(s.phase === "disantap" ? s.ipAtMeal : s.ipNow)}</span>
                <StatusPill status={s.phase === "disantap" ? s.statusAtMeal : s.statusNow} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > 60 ? <p className="mt-3 text-xs text-muted">Menampilkan 60 dari {rows.length} titik antar. Ketik nama sekolah untuk mempersempit.</p> : null}
      <p className="mt-8 text-xs text-muted">Nama sekolah dan posyandu di prototipe ini disimulasikan dari nama kecamatan; di lapangan daftar penerima diambil dari SIPGN.</p>
      <Tour
        id="sekolah"
        steps={[
          { target: "search", title: "Cari sekolahmu", body: <>Pilih provinsi dan kabupaten, lalu ketik nama sekolah. Di lapangan, cara tercepat adalah memindai QR di label boks MBG.</> },
          { target: "list", title: "Status setiap pengantaran", body: <>Angka di kanan adalah Indeks Paparan. Klik satu baris untuk melihat sampai jam berapa makanannya aman dan bagaimana suhunya berubah.</> },
        ]}
      />
    </main>
  );
}
