import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow, StatusPill, fmtInt } from "@/components/ui";
import { kitchenRows } from "@/lib/pilot/engine";
import { PROVINCES, SOURCES, allocateSppg, type ProvinceId } from "@/lib/pilot/reference";
import { dayContext } from "@/lib/server/context";
import { statusOf } from "@/lib/model/ip";

export const metadata: Metadata = { title: "Dapur SPPG" };
export const dynamic = "force-dynamic";

export default async function DapurIndex({ searchParams }: { searchParams: Promise<{ t?: string; prov?: string; reg?: string; q?: string }> }) {
  const sp = await searchParams;
  const prov = (PROVINCES.find((p) => p.id === sp.prov)?.id ?? "DIY") as ProvinceId;
  const province = PROVINCES.find((p) => p.id === prov)!;
  const reg = province.regencies.find((r) => r.id === sp.reg)?.id;
  const { states } = await dayContext(sp.t, { province: prov, regency: reg });
  const q = (sp.q ?? "").toLowerCase().trim();
  const rows = kitchenRows(states)
    .filter((r) => !q || r.kitchen.name.toLowerCase().includes(q) || r.regency.name.toLowerCase().includes(q))
    .sort((a, b) => b.alerts - a.alerts || b.maxIpAtMeal - a.maxIpAtMeal);
  const alloc = allocateSppg(province);
  const tq = sp.t ? `t=${encodeURIComponent(sp.t)}&` : "";

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
      <Eyebrow>Portal dapur · pilih SPPG</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Dapur mana yang sedang kamu jaga?</h1>
      <p className="mt-3 max-w-2xl text-ink-2">
        Petugas SPPG masuk lewat akun SIPGN dan langsung melihat dapurnya sendiri. Di prototipe ini kamu bisa membuka dapur mana pun di tiga provinsi pilot.
      </p>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Provinsi">
        {PROVINCES.map((p) => (
          <Link key={p.id} role="tab" aria-selected={p.id === prov} href={`/dapur?${tq}prov=${p.id}`} className={`rounded-xl px-4 py-2 text-sm font-semibold ${p.id === prov ? "bg-ink text-white" : "bg-white text-ink-2 hover:bg-white/70"}`}>
            {p.short} <span className="font-mono text-xs opacity-70">{p.sppg}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link href={`/dapur?${tq}prov=${prov}`} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!reg ? "bg-daun text-white" : "bg-white/70 text-ink-2"}`}>
          Semua kab/kota
        </Link>
        {province.regencies.map((r) => (
          <Link key={r.id} href={`/dapur?${tq}prov=${prov}&reg=${r.id}`} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${reg === r.id ? "bg-daun text-white" : "bg-white/70 text-ink-2 hover:bg-white"}`}>
            {r.name} <span className="font-mono opacity-60">{alloc.get(r.id)}</span>
          </Link>
        ))}
      </div>

      <form className="mt-4 flex max-w-md gap-2" action="/dapur">
        {sp.t ? <input type="hidden" name="t" value={sp.t} /> : null}
        <input type="hidden" name="prov" value={prov} />
        {reg ? <input type="hidden" name="reg" value={reg} /> : null}
        <label className="sr-only" htmlFor="q">Cari SPPG</label>
        <input id="q" name="q" defaultValue={sp.q} placeholder="Cari nama SPPG atau kecamatan" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" />
        <button className="rounded-xl bg-daun px-4 text-sm font-semibold text-white">Cari</button>
      </form>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.slice(0, 90).map((r) => (
          <li key={r.kitchen.id}>
            <Link href={`/dapur/${r.kitchen.id}${sp.t ? `?t=${encodeURIComponent(sp.t)}` : ""}`} className="card flex items-center justify-between gap-3 px-4 py-3 transition hover:border-daun">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{r.kitchen.name}</span>
                <span className="block truncate text-xs text-muted">
                  {r.regency.name} · {fmtInt(r.kitchen.beneficiaries)} penerima · {r.batches} batch · {r.kitchen.slhs ? "SLHS" : "belum SLHS"}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <StatusPill status={statusOf(r.maxIpAtMeal)} />
                {r.alerts ? <span className="text-[11px] font-semibold text-buang">{r.alerts} peringatan</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > 90 ? <p className="mt-3 text-xs text-muted">Menampilkan 90 dari {rows.length} SPPG. Persempit dengan kab/kota atau pencarian.</p> : null}
      <p className="mt-8 text-xs text-muted">
        Jumlah SPPG provinsi: {SOURCES.bgnJun26.label}. Sebaran per kab/kota proporsional jumlah penduduk; nama dapur memakai nama kecamatan dan bersifat simulasi.
      </p>
    </main>
  );
}
