import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox, SegLink, StatusPill, fmtInt, fmtIp } from "@/components/ui";
import { InfoTip } from "@/components/info-tip";
import { kitchenRows } from "@/lib/pilot/engine";
import { PROVINCES, SOURCES, allocateSppg, type ProvinceId } from "@/lib/pilot/reference";
import { dayContext } from "@/lib/server/context";
import { statusOf } from "@/lib/model/ip";

export const metadata: Metadata = { title: "Dapur SPPG" };
export const dynamic = "force-dynamic";

const COLS = "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_90px_64px_92px_100px]";

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
  const tOnly = sp.t ? `?t=${encodeURIComponent(sp.t)}` : "";

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-none tracking-[-0.04em]">Pilih dapur.</h1>
      <p className="lede mt-4 max-w-xl">
        <b>Di lapangan, akun SIPGN langsung membuka dapurmu sendiri.</b> Di prototipe ini semua {fmtInt(province.sppg)} SPPG {province.short} bisa dibuka.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Provinsi" className="flex gap-1 rounded-full bg-paper-2 p-1">
          {PROVINCES.map((p) => (
            <SegLink key={p.id} href={`/dapur?${tq}prov=${p.id}`} active={p.id === prov}>
              {p.short} <span className="ml-1 font-mono text-[11px] opacity-60">{p.sppg}</span>
            </SegLink>
          ))}
        </nav>
        <SearchBox action="/dapur" hidden={{ t: sp.t, prov, reg }} defaultValue={sp.q} placeholder="Nama SPPG atau kab/kota" label="Cari SPPG" />
      </div>
      <nav aria-label="Kabupaten/kota" className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <SegLink href={`/dapur?${tq}prov=${prov}`} active={!reg}>
          Semua
        </SegLink>
        {province.regencies.map((r) => (
          <SegLink key={r.id} href={`/dapur?${tq}prov=${prov}&reg=${r.id}`} active={reg === r.id}>
            {r.name} <span className="ml-1 font-mono text-[11px] opacity-60">{alloc.get(r.id)}</span>
          </SegLink>
        ))}
      </nav>

      <div className="card mt-6 overflow-hidden">
        <div className={`hidden gap-4 border-b border-line bg-paper px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted md:grid ${COLS}`}>
          <span>SPPG</span>
          <span>Kab/kota</span>
          <span className="text-right">Penerima</span>
          <span className="text-right">Batch</span>
          <span className="flex items-center justify-end">
            IP maks
            <InfoTip title="IP maks" align="right">Indeks Paparan tertinggi di antara batch dapur ini, pada jam makan terjadwal.</InfoTip>
          </span>
          <span className="text-right">Status</span>
        </div>
        <ul className="divide-y divide-line">
          {rows.slice(0, 90).map((r) => {
            const st = statusOf(r.maxIpAtMeal);
            return (
              <li key={r.kitchen.id}>
                <Link href={`/dapur/${r.kitchen.id}${tOnly}`} className={`grid items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-paper ${COLS}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.kitchen.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {r.kitchen.slhs ? "ber-SLHS" : "belum SLHS"}
                      <span className="md:hidden"> · {r.regency.name} · {r.batches} batch</span>
                      {r.alerts ? <b className="font-semibold text-buang"> · {r.alerts} peringatan</b> : null}
                    </span>
                  </span>
                  <span className="hidden truncate text-sm text-ink-2 md:block">{r.regency.name}</span>
                  <span className="hidden text-right font-mono text-sm tnum md:block">{fmtInt(r.kitchen.beneficiaries)}</span>
                  <span className="hidden text-right font-mono text-sm tnum md:block">{r.batches}</span>
                  <span className="hidden text-right font-mono text-sm tnum md:block" style={{ color: st === "aman" ? undefined : `var(--color-${st === "waspada" ? "waspada-ink" : "buang"})` }}>
                    {fmtIp(r.maxIpAtMeal)}
                  </span>
                  <span className="flex justify-end">
                    <StatusPill status={st} />
                  </span>
                </Link>
              </li>
            );
          })}
          {rows.length === 0 ? <li className="px-5 py-10 text-center text-sm text-muted">Tidak ada SPPG yang cocok dengan &ldquo;{sp.q}&rdquo;.</li> : null}
        </ul>
      </div>
      <p className="mt-4 text-xs text-muted">
        {rows.length > 90 ? `90 dari ${rows.length} SPPG ditampilkan. ` : ""}Jumlah SPPG: {SOURCES.bgnJun26.label}. Sebaran per kab/kota proporsional penduduk; nama dapur disimulasikan dari nama kecamatan.
      </p>
    </main>
  );
}
