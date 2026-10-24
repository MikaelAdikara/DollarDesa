import type { Metadata } from "next";
import { InfoTip } from "@/components/info-tip";
import { IpSimulator } from "@/components/ip-simulator";
import { Tour } from "@/components/tour";
import { bacterialMinutesPerHour, monteCarloIP, RATKOWSKY } from "@/lib/model/ip";

export const metadata: Metadata = { title: "Metode Indeks Paparan" };

const CASES = [
  { name: "Pembanding: patuh 4 jam", gap: 4, T: 27, sc: "tertutup" as const, ref: 0.23, refP: "0%", src: "skenario acuan" },
  { name: "SDN Jakarta Timur", gap: 5, T: 30, sc: "tersentuh" as const, ref: 0.85, refP: "15%", src: "detik, Mei 2026" },
  { name: "SMPN 3 Berbah, Sleman", gap: 5.5, T: 28, sc: "tersentuh" as const, ref: 0.93, refP: "32%", src: "harianjogja, 28/8/2025" },
  { name: "Sidoarjo", gap: 7, T: 30, sc: "tersentuh" as const, ref: 1.39, refP: "100%", src: "Kompas, 4/9/2026" },
  { name: "SMKN 6 Semarang", gap: 12, T: 29, sc: "tersentuh" as const, ref: 2.56, refP: "100%", src: "jatengnews, 4/8/2026" },
  { name: "Jayapura, Papua", gap: 16, T: 27, sc: "tersentuh" as const, ref: 3.16, refP: "100%", src: "Kompas, 5/8/2026" },
];

export default function MetodePage() {
  const rows = CASES.map((c) => ({ ...c, mc: monteCarloIP(c.gap, c.T, c.sc, 4000, 23) }));
  const temps = [20, 22, 24, 26, 28, 30, 32, 34, 36];
  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6">
      <h1 className="max-w-4xl text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">Suhu dan jam, jadi satu angka.</h1>
      <p className="lede mt-4 max-w-xl text-lg">
        <b>Geser suhu ruang dan jeda waktu.</b> Kode yang menghitung di sini sama dengan yang dipakai server.
      </p>

      <section className="mt-8">
        <IpSimulator />
      </section>

      <section className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1fr_1fr]" data-tour="formula">
        <div className="card p-6">
          <h2 className="text-xl font-bold">Lima langkah</h2>
          <ol className="mt-5 divide-y divide-line border-y border-line text-sm leading-relaxed">
            <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3.5">
              <span className="font-mono text-muted tnum">1</span>
              <span className="min-w-0 text-ink-2 [&_b]:text-ink">
                <b>Pendinginan Newton.</b> Suhu makanan turun dari suhu terukur menuju suhu ruang: <span className="font-mono">T(t) = T<sub>ruang</sub> + (T<sub>0</sub> − T<sub>ruang</sub>)·e<sup>−kt</sup></span>. Di lapangan, k dihitung dari dua pembacaan berturut-turut: <span className="font-mono">k = −ln((T₂ − T<sub>r</sub>)/(T₁ − T<sub>r</sub>))/Δt</span>.
              </span>
            </li>
            <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3.5">
              <span className="font-mono text-muted tnum">2</span>
              <span className="min-w-0 text-ink-2 [&_b]:text-ink">
                <b>Laju tumbuh Ratkowsky.</b> <span className="font-mono">√μ = a(T − T<sub>min</sub>)·[1 − e<sup>b(T − T<sub>max</sub>)</sup>]</span> dengan a = {RATKOWSKY.a}, b = {RATKOWSKY.b}, T<sub>min</sub> = {RATKOWSKY.Tmin}°C, T<sub>max</sub> = {RATKOWSKY.Tmax}°C (<i>B. cereus</i> vegetatif, Dong dkk. 2025). μ dalam log₁₀ CFU/g per jam; di atas 47,1°C bakteri tidak tumbuh.
              </span>
            </li>
            <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3.5">
              <span className="font-mono text-muted tnum">3</span>
              <span className="min-w-0 text-ink-2 [&_b]:text-ink">
                <b>Fase lag Baranyi.</b> Pertumbuhan baru dihitung setelah kerja terkumpul melewati h₀. Karena kerja dan pertumbuhan memakai integral yang sama, ini setara dengan <span className="font-mono">tumbuh = max(0, W − h₀)</span>.
              </span>
            </li>
            <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3.5">
              <span className="font-mono text-muted tnum">4</span>
              <span className="min-w-0 text-ink-2 [&_b]:text-ink">
                <b>Indeks Paparan.</b> <span className="font-mono">IP = tumbuh ÷ log₁₀(10⁵/10²) = tumbuh ÷ 3</span>. IP 1,0 berarti margin dari 10² ke 10⁵ CFU/g habis.
              </span>
            </li>
            <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3.5">
              <span className="font-mono text-muted tnum">5</span>
              <span className="min-w-0 text-ink-2 [&_b]:text-ink">
                <b>Ketidakpastian.</b> Monte Carlo atas k dan h₀; status memakai persentil ke-95. Pada batch nyata k diukur, sehingga yang tersisa hanya h₀: P95 diambil di h₀ persentil ke-5.
              </span>
            </li>
          </ol>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center text-xl font-bold">
            Jam bakteri
            <InfoTip title="Menit pertumbuhan per jam dinding">μ(T)/μ(24°C) × 60. Pada 24°C satu jam dinding = 60 menit pertumbuhan; pada 36°C = 124 menit, 2,9 kali lebih cepat daripada 20°C.</InfoTip>
          </h2>
          <p className="mt-1 text-sm text-muted">Menit pertumbuhan per jam dinding · 24°C = 60 menit</p>
          <div className="mt-5 grid gap-1.5">
            {temps.map((T) => {
              const m = bacterialMinutesPerHour(T);
              return (
                <div key={T} className="grid grid-cols-[44px_1fr_64px] items-center gap-2 text-sm">
                  <span className="font-mono text-muted">{T}°C</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-paper-2">
                    <span className="block h-full rounded-full" style={{ width: `${(m / 130) * 100}%`, background: T >= 32 ? "var(--color-buang)" : T >= 28 ? "var(--color-detak)" : "var(--color-daun)" }} />
                  </span>
                  <span className="text-right font-mono tnum">{m.toFixed(0)} mnt</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card mt-6 overflow-x-auto p-6" data-tour="backtest">
        <h2 className="flex items-center text-xl font-bold">
          Uji balik pada kasus nyata
          <InfoTip title="Kenapa kolomnya dua">&quot;Paket data&quot; adalah hasil skrip Python tim (03_uji_balik_indeks_paparan.csv). &quot;Aplikasi&quot; dihitung ulang sekarang dengan kode TypeScript yang dipakai DETAK. Selisih kecil berasal dari generator acak yang berbeda.</InfoTip>
        </h2>
        <p className="lede mt-1 text-sm">
          <b>Tiga dari lima insiden terbaca melewati ambang; skenario patuh 4 jam hanya 0,23.</b> Hanya 5 dari 15 insiden mencatat jeda masak–santap.
        </p>
        <table className="mt-4 w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y border-line bg-paper text-left font-mono text-[10px] uppercase tracking-wider text-muted">
              <th className="py-2 pl-2 pr-3 font-normal">Kasus</th>
              <th className="py-2 pr-3 text-right font-normal">Jeda</th>
              <th className="py-2 pr-3 text-right font-normal">Suhu</th>
              <th className="py-2 pr-3 text-right font-normal">IP median · paket data</th>
              <th className="py-2 pr-3 text-right font-normal">IP median · aplikasi</th>
              <th className="py-2 pr-3 text-right font-normal">P(IP ≥ 1) · aplikasi</th>
              <th className="py-2 font-normal">Sumber jeda</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line">
                <td className="py-2.5 pl-2 pr-3 font-semibold">{r.name}</td>
                <td className="py-2 pr-3 text-right font-mono">{String(r.gap).replace(".", ",")} j</td>
                <td className="py-2 pr-3 text-right font-mono">{r.T}°C</td>
                <td className="py-2 pr-3 text-right font-mono">{r.ref.toFixed(2).replace(".", ",")}</td>
                <td className={`py-2 pr-3 text-right font-mono font-bold ${r.mc.median >= 1 ? "text-buang" : r.mc.median >= 0.8 ? "text-waspada-ink" : "text-aman"}`}>{r.mc.median.toFixed(2).replace(".", ",")}</td>
                <td className="py-2 pr-3 text-right font-mono">{Math.round(r.mc.pOver * 100)}%</td>
                <td className="py-2 text-xs text-muted">{r.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2" data-tour="assumptions">
        <div className="card p-6">
          <h2 className="text-xl font-bold">Sumber tiap parameter</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {[
                ["a, b, Tmin, Tmax Ratkowsky", "Dong dkk. (2025)", "Jurnal"],
                ["Suhu awal makanan 65°C", "Dipakai hanya bila titik Matang tidak tercatat", "Asumsi"],
                ["Laju pendinginan k", "Diukur per batch; U(0,35–1,00) bila belum ada dua pembacaan", "Asumsi → diukur"],
                ["Lag h₀ 0,5–1,7", "Rentang Baranyi", "Asumsi"],
                ["Ambang 10⁵ CFU/g", "Konsensus mikrobiologi pangan", "Konsensus"],
                ["Beban awal 10² CFU/g", "Dapur ber-SLHS", "Asumsi"],
                ["Faktor lauk tersentuh ×1,5", "Skenario konservatif tim", "Asumsi"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-b border-line">
                  <td className="py-2 pr-3 font-semibold">{a}</td>
                  <td className="py-2 pr-3 text-muted">{b}</td>
                  <td className="py-2 text-right">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${c === "Jurnal" ? "bg-aman-tint text-aman" : c === "Konsensus" ? "bg-waspada-tint text-waspada-ink" : "bg-buang-tint text-buang"}`}>{c}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Parameter berlabel Asumsi adalah hal pertama yang dikalibrasi saat pilot memakai pembacaan lapangan dan uji lab (modul Kendali).</p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-bold">Batas tafsir</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line text-sm leading-relaxed text-ink-2 [&>li]:py-3">
            <li><b className="text-ink">Satu bakteri acuan.</b> <i>B. cereus</i> dipilih karena khas nasi dan sporanya tahan dimasak. Patogen lain (E. coli, Salmonella, S. aureus) memakai kerangka yang sama dengan parameter berbeda; belum dimasukkan.</li>
            <li><b className="text-ink">Persentil ke-95.</b> IP adalah batas atas yang wajar, bukan ramalan pasti keracunan. Status Buang berarti margin keamanan habis.</li>
            <li><b className="text-ink">n = 5 untuk uji balik.</b> Cukup untuk menguji arah, tidak cukup untuk validasi statistik. Setiap batch yang tercatat DETAK menambah data uji.</li>
            <li><b className="text-ink">Suhu makanan inti.</b> Termometer tusuk mengukur satu titik; ompreng di tepi boks bisa lebih dingin atau lebih hangat. Karena itu 20 ompreng diambil sebagai sampel harian untuk kartu kendali p.</li>
          </ul>
        </div>
      </section>

      <Tour
        id="metode-v2"
        steps={[
          { target: "sim-controls", title: "Ubah kondisinya", body: <>Coba 30°C 5 jam, lalu 24°C 5 jam. Jamnya sama, risikonya beda.</> },
          { target: "sim-result", title: "Empat angka hasil", body: <>IP P95 menentukan status. <b>Batas aman model</b> dibandingkan dengan aturan 4 jam.</> },
          { target: "sim-fan", title: "Kipas kemungkinan", body: <>Tiap pita = ratusan simulasi. Titik oranye di zona merah = lewat batas aman.</> },
          { target: "backtest", title: "Diuji pada kasus nyata", body: <>Lima insiden dihitung ulang oleh aplikasi, dibandingkan dengan skrip tim.</> },
          { target: "assumptions", title: "Jujur soal asumsi", body: <>Yang berlabel Asumsi dikalibrasi saat pilot.</> },
        ]}
      />
    </main>
  );
}
