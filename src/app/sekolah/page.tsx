import Link from "next/link";
import type { Metadata } from "next";
import { STATUS_META, SearchBox, SegLink, StatusPill, fmtIp } from "@/components/ui";
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
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-10 sm:px-6">
      <h1 className="text-[clamp(2.2rem,5.5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">Cek makanan hari ini.</h1>
      <p className="lede mt-4 max-w-lg text-lg">
        <b>Pindai QR di label boks MBG.</b> Tidak ada label? Cari nama sekolahnya.
      </p>

      <div data-tour="search" className="mt-8">
        <SearchBox action="/sekolah" size="lg" hidden={{ t: sp.t, prov, reg }} defaultValue={sp.q} placeholder="Contoh: SDN 2 Depok" label="Nama sekolah" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <nav aria-label="Provinsi" className="flex gap-1 rounded-full bg-paper-2 p-1">
            {PROVINCES.map((p) => (
              <SegLink key={p.id} href={`/sekolah?${tq}prov=${p.id}`} active={p.id === prov}>
                {p.short}
              </SegLink>
            ))}
          </nav>
        </div>
        <nav aria-label="Kabupaten/kota" className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {province.regencies.map((r) => (
            <SegLink key={r.id} href={`/sekolah?${tq}prov=${prov}&reg=${r.id}`} active={reg === r.id}>
              {r.name}
            </SegLink>
          ))}
        </nav>
      </div>

      <ul data-tour="list" className="mt-6 divide-y divide-line border-y border-line">
        {rows.slice(0, 60).map((s) => {
          const st = s.phase === "disantap" ? s.statusAtMeal : s.statusNow;
          return (
            <li key={s.id}>
              <Link href={`/cek/${s.id}${tOnly}`} className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold group-hover:text-daun">{s.batch.school.name}</span>
                  <span className="block truncate text-xs text-muted">
                    makan {fmtClock(s.batch.mealAt, s.batch.tzOffset)} {s.province.tzLabel} · {PHASE_LABEL[s.phase].toLowerCase()}
                  </span>
                </span>
                <span className="font-mono text-lg tnum" style={{ color: STATUS_META[st].hex }}>
                  {fmtIp(s.phase === "disantap" ? s.ipAtMeal : s.ipNow)}
                </span>
                <span className="w-[84px] text-right">
                  <StatusPill status={st} />
                </span>
              </Link>
            </li>
          );
        })}
        {rows.length === 0 ? <li className="py-10 text-center text-sm text-muted">Tidak ada sekolah bernama &ldquo;{sp.q}&rdquo; di kab/kota ini.</li> : null}
      </ul>
      <p className="mt-4 text-xs text-muted">
        {rows.length > 60 ? `60 dari ${rows.length} titik antar ditampilkan. ` : ""}Nama sekolah dan posyandu disimulasikan dari nama kecamatan; di lapangan daftar penerima diambil dari SIPGN.
      </p>
      <Tour
        id="sekolah-v2"
        steps={[
          { target: "search", title: "Cari sekolahmu", body: <>Ketik nama, atau pilih kabupaten. Di lapangan cukup pindai QR di boks.</> },
          { target: "list", title: "Status tiap pengantaran", body: <>Angka = Indeks Paparan sekarang. Klik baris untuk melihat sampai jam berapa aman.</> },
        ]}
      />
    </main>
  );
}
