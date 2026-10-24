import type { Metadata } from "next";
import { Tour } from "@/components/tour";
import { fmtInt } from "@/components/ui";
import { NATIONAL, PILOT_TOTAL_SPPG, PROVINCES, SOURCES, allocateSppg } from "@/lib/pilot/reference";
import { kitchens } from "@/lib/pilot/sim";

export const metadata: Metadata = { title: "Implementasi" };

function Architecture() {
  const box = (x: number, y: number, w: number, h: number, title: string, lines: string[], fill = "var(--color-card)", stroke = "var(--color-line)", titleColor = "var(--color-ink)") => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text x={x + 14} y={y + 24} fontSize="14" fontWeight={700} fill={titleColor} fontFamily="var(--font-funnel-display)">
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={x + 14} y={y + 44 + i * 17} fontSize="11.5" fill="var(--color-ink-2)">
          {l}
        </text>
      ))}
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number, label?: string) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-daun)" strokeWidth={2} markerEnd="url(#arr)" />
      {label ? (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="10.5" fill="var(--color-daun)" fontFamily="var(--font-geist-mono)">
          {label}
        </text>
      ) : null}
    </g>
  );
  return (
    <svg viewBox="0 0 1100 470" className="h-auto w-full" role="img" aria-label="Diagram arsitektur DETAK">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-daun)" />
        </marker>
      </defs>
      <text x={20} y={22} fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-geist-mono)" letterSpacing="2">LAPANGAN</text>
      {box(20, 34, 230, 92, "Dapur SPPG", ["Termometer tusuk (titik 1)", "Sensor suhu ruang + CCTV (titik 2)", "Ponsel petugas · aplikasi PWA"])}
      {box(20, 146, 230, 92, "Sekolah / posyandu", ["Termometer tusuk (titik 3, 4)", "Guru piket memindai QR label", "Logbook digital"])}
      {box(20, 258, 230, 72, "Orang tua", ["Pindai QR · tanpa akun", "Hanya status batch, tanpa data pribadi"])}
      <text x={300} y={22} fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-geist-mono)" letterSpacing="2">DETAK · MODUL KE-8 SIPGN</text>
      {box(300, 34, 300, 120, "API DETAK (Next.js · serverless)", ["POST /readings · /actions · /ip", "GET /batches · /alerts · /inspections", "Validasi zod · peran dari SSO SIPGN", "Jam dicap server, bukan klien"], "var(--color-daun-tint)", "var(--color-daun)", "var(--color-daun-2)")}
      {box(300, 174, 300, 104, "Mesin Indeks Paparan", ["Newton + Ratkowsky + lag Baranyi", "k diukur dari dua pembacaan", "P95 · proyeksi ke jam makan", "Status Aman / Waspada / Buang"], "var(--color-detak-tint)", "var(--color-detak)", "var(--color-ink)")}
      {box(300, 298, 300, 84, "Penyimpanan kejadian (Postgres)", ["detak_event: append-only", "pembacaan, tahan, lepas, inspeksi", "indeks per hari & per batch"])}
      <text x={650} y={22} fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-geist-mono)" letterSpacing="2">SUMBER & LAYAR</text>
      {box(650, 34, 210, 92, "SIPGN (data induk)", ["Daftar SPPG & sekolah", "Rencana distribusi harian", "Akun & peran (SSO)"], "var(--color-paper-2)")}
      {box(650, 146, 210, 72, "Notifikasi", ["WhatsApp/SMS gateway SIPGN", "saat peringatan dini & ditahan"], "var(--color-paper-2)")}
      {box(880, 34, 200, 70, "Layar Dapur", ["/dapur · catat suhu, cetak QR"])}
      {box(880, 116, 200, 70, "Layar Sekolah", ["/cek · satu angka, satu warna"])}
      {box(880, 198, 200, 70, "Control panel Dinas", ["/dinas · tahan batch, antrean"])}
      {box(880, 280, 200, 70, "Dashboard BGN", ["/bgn · indikator pilot"])}
      {arrow(250, 80, 300, 80, "suhu")}
      {arrow(250, 192, 300, 110, "suhu")}
      {arrow(250, 294, 300, 140, "pindai")}
      {arrow(450, 154, 450, 174)}
      {arrow(450, 278, 450, 298)}
      {arrow(650, 80, 600, 80, "induk")}
      {arrow(600, 210, 650, 182, "alert")}
      {arrow(600, 64, 880, 64)}
      {arrow(600, 100, 880, 150)}
      {arrow(600, 130, 880, 232)}
      {arrow(600, 145, 880, 314)}
      <rect x={20} y={400} width={1060} height={52} rx={12} fill="var(--color-ink)" />
      <text x={40} y={424} fontSize="12" fill="var(--color-card)" fontWeight={700}>
        Di prototipe ini:
      </text>
      <text x={40} y={442} fontSize="11.5" fill="var(--color-line)">
        data induk SIPGN dan pembacaan perangkat disimulasikan deterministik dari angka resmi; API, mesin Indeks Paparan, penyimpanan kejadian, dan semua layar sudah berjalan seperti produksi.
      </text>
    </svg>
  );
}

const FAQ: [string, string][] = [
  ["Apa bedanya DETAK dengan SOP Pendinginan BGN yang sudah mewajibkan catat suhu?", "SOP mewajibkan mencatat. DETAK mengubah catatan itu menjadi keputusan: dihitung jadi Indeks Paparan, keluar status, dikirim ke guru dan orang tua, dan menyusun antrean inspeksi. Tanpa itu, catatan suhu hanya berakhir di logbook."],
  ["Kenapa tidak cukup mengikuti aturan 4 jam?", "Empat jam adalah satu angka untuk semua kondisi. Pada 36°C bakteri tumbuh 2,9 kali lebih cepat daripada 20°C. DETAK tetap menghormati batas 4 jam, tetapi memakai batas yang lebih dulu habis."],
  ["Bagaimana kalau petugas memalsukan suhu atau jam?", "Jam dicap server (di lapangan: jam CCTV dan sensor), bukan diketik. Sensor ruang mencatat otomatis sehingga angka termometer bisa dicocokkan. Titik 3 dan 4 dicatat pihak sekolah, bukan dapur. Data janggal menaikkan dapur di antrean inspeksi lewat kartu kendali p."],
  ["Bagaimana kalau sinyal internet di Papua tidak ada?", "Aplikasi dirancang sebagai PWA yang menyimpan pembacaan saat luring dan mengirimnya saat ada sinyal; status di titik pra-konsumsi tetap bisa dihitung di perangkat karena rumusnya ringan. Papua sengaja masuk pilot untuk menguji kondisi terberat."],
  ["Kalau statusnya Buang, anak-anak makan apa?", "Keputusan akhir tetap pada SPPG dan Dinas sesuai kewenangan; penggantian makanan mengikuti mekanisme BGN yang ada. Yang dipastikan DETAK: keputusan diambil sebelum makanan disantap, bukan setelah ada korban."],
  ["Apakah data anak atau orang tua dikumpulkan?", "Tidak. Unit datanya adalah batch makanan. Halaman orang tua tidak memerlukan akun dan tidak menyimpan identitas. Data pribadi hanya akun petugas di SIPGN."],
  ["Berapa biayanya?", "Rp5,1 miliar untuk 29.991 SPPG: 1 sensor suhu ruang (Rp20 rb) dan 3 termometer tusuk (Rp50 rb) per dapur; CCTV memakai instruksi yang sudah ada. Pilot 999 SPPG sekitar Rp170 juta. Dengan harga sensor ritel Rp80 rb, totalnya Rp6,9 miliar."],
  ["Apakah angka di prototipe ini nyata?", "Jumlah SPPG per provinsi, penerima per SPPG, penduduk per kabupaten, insiden, model, klaster, dan bobot AHP berasal dari sumber yang dicantumkan. Dapur, sekolah, jadwal, dan pembacaan suhu harian disimulasikan dari angka tersebut sampai terhubung ke SIPGN."],
  ["Kenapa pilotnya DIY, Papua, dan Sumatera Barat?", "Satu provinsi dari setiap klaster K-Means 38 provinsi, yaitu yang laju insidennya tertinggi di klasternya (sekaligus skor AHP–SAW tertinggi): DIY 0,754, Papua 0,590, Sumbar 0,322. Total 999 SPPG, 3,3% dari nasional."],
  ["Bagaimana menilai pilot berhasil?", "Tiga indikator di dashboard BGN: batch dengan data suhu lengkap, batch IP ≥ 1 yang tertahan sebelum disantap, dan laju korban per juta porsi dibanding baseline 1,93. Gerbang perluasan diusulkan setelah 8 minggu berturut-turut memenuhi target."],
  ["Model memakai satu bakteri saja, apa cukup?", "B. cereus dipakai sebagai acuan karena khas nasi dan sporanya bertahan setelah dimasak, sehingga risikonya justru muncul setelah matang. Kerangkanya bisa memakai parameter patogen lain; itu pengembangan berikutnya, bukan klaim saat ini."],
  ["Apakah DETAK menggantikan uji laboratorium?", "Tidak. Uji lab butuh hari, sedangkan makanan harus diputuskan dalam hitungan jam. DETAK adalah penyaring sebelum makan; antrean inspeksi menentukan dapur mana yang sampelnya diuji lab lebih dulu."],
];

export default function ImplementasiPage() {
  const ks = kitchens();
  const schools = ks.reduce((a, k) => a + k.schools.length, 0);
  const readsPerDay = schools * 4;
  const natReads = Math.round((readsPerDay / PILOT_TOTAL_SPPG) * NATIONAL.sppg);
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="max-w-4xl text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">Yang sudah berjalan, dan cara memasangnya.</h1>
      <p className="lede mt-4 max-w-xl text-lg">
        <b>Modul ke-8 SIPGN: satu API, empat layar, satu mesin hitung.</b> Semua yang tampil di prototipe ini memanggil API yang sama.
      </p>

      <section className="card mt-8 p-5" data-tour="arch">
        <h2 className="text-xl font-bold">Arsitektur</h2>
        <div className="mt-4">
          <Architecture />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <div className="card overflow-x-auto p-5" data-tour="roles">
          <h2 className="text-xl font-bold">Siapa boleh melakukan apa</h2>
          <table className="mt-4 w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-y border-line bg-paper text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3">Tindakan</th>
                <th className="py-2 pr-2 text-center">SPPG</th>
                <th className="py-2 pr-2 text-center">Sekolah</th>
                <th className="py-2 pr-2 text-center">Dinas</th>
                <th className="py-2 text-center">BGN</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Catat titik 1 Matang & 2 Berangkat", "✓", "", "", ""],
                ["Catat titik 3 Tiba", "✓", "✓", "", ""],
                ["Catat titik 4 Pra-konsumsi", "", "✓", "", ""],
                ["Tahan batch", "✓", "✓", "✓", ""],
                ["Lepas tahanan, catat inspeksi", "", "", "✓", ""],
                ["Lihat status batch (QR)", "✓", "✓", "✓", "✓"],
                ["Dashboard provinsi & antrean", "", "", "✓", "✓"],
                ["Indikator pilot nasional", "", "", "", "✓"],
              ].map(([a, ...cells]) => (
                <tr key={a} className="border-b border-line">
                  <td className="py-2 pr-3">{a}</td>
                  {cells.map((c, i) => (
                    <td key={i} className="py-2 pr-2 text-center font-bold text-daun">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Aturan ini dijalankan di server (lihat kode route API), bukan hanya disembunyikan di tampilan. Di prototipe, peran dipilih otomatis saat membuka portal; di produksi peran datang dari SSO SIPGN.</p>
        </div>

        <div className="card p-5" data-tour="slo">
          <h2 className="text-xl font-bold">Beban & target layanan</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Pembacaan per hari · pilot</dt>
              <dd className=" text-2xl font-bold tnum">{fmtInt(readsPerDay)}</dd>
              <dd className="text-xs text-muted">{fmtInt(schools)} batch × 4 titik</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Pembacaan per hari · nasional</dt>
              <dd className=" text-2xl font-bold tnum">±{fmtInt(natReads)}</dd>
              <dd className="text-xs text-muted">puncak 06.00–12.00 ≈ {Math.round(natReads / (6 * 3600))} tulis/detik</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Target respons status</dt>
              <dd className=" text-2xl font-bold">p95 &lt; 300 ms</dd>
              <dd className="text-xs text-muted">halaman QR orang tua & guru</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ketersediaan</dt>
              <dd className=" text-2xl font-bold">99,5%</dd>
              <dd className="text-xs text-muted">jam layanan 04.00–14.00 lokal</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">RPO / RTO</dt>
              <dd className=" text-2xl font-bold">5 mnt / 1 jam</dd>
              <dd className="text-xs text-muted">PITR Postgres, deploy ulang serverless</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Sifat data</dt>
              <dd className=" text-2xl font-bold">Internal</dd>
              <dd className="text-xs text-muted">tanpa data anak; akun petugas di SIPGN</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted">
            Arsitektur: monolit modular (Next.js serverless + Postgres). Rasio baca:tulis sekitar 20:1 dan puncak tulis di bawah 100/detik, jadi tidak perlu antrean pesan atau layanan mikro pada fase nasional pertama.
          </p>
        </div>
      </section>

      <section className="card mt-6 overflow-x-auto p-5" data-tour="api">
        <h2 className="text-xl font-bold">API yang sudah berjalan</h2>
        <p className="mt-1 text-sm text-muted">Respons JSON berbentuk {"{ data, meta }"} atau {"{ error: { code, message, details } }"}. Semua parameter divalidasi; query <span className="font-mono">t=HH:MM</span> memutar ulang hari layanan pada jam tertentu.</p>
        <table className="mt-4 w-full min-w-[760px] text-sm">
          <tbody>
            {[
              ["GET", "/api/health", "status layanan dan penyimpanan"],
              ["GET", "/api/pilot/summary", "ringkasan hari ini per provinsi"],
              ["GET", "/api/kitchens?province=DIY&regency=3404", "daftar SPPG dengan ringkasan hari ini"],
              ["GET", "/api/kitchens/{id}", "satu SPPG, batch hari ini, kartu kendali p 20 hari"],
              ["GET", "/api/batches/{id}", "status yang dilihat guru/orang tua, termasuk jalur suhu & IP"],
              ["POST", "/api/batches/{id}/readings", "catat suhu titik 1–4 (peran dicek per titik)"],
              ["POST", "/api/batches/{id}/actions", "tahan, lepas, atau catat inspeksi"],
              ["GET", "/api/alerts?province=DIY", "peringatan dini, urut waktu tersisa"],
              ["GET", "/api/inspections?province=DIY", "antrean inspeksi AHP–SAW dengan alasan"],
              ["POST", "/api/ip", "kalkulator tanpa simpan untuk modul atau perangkat lain"],
            ].map(([m, p, d]) => (
              <tr key={p} className="border-b border-line">
                <td className="py-2 pr-3">
                  <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${m === "GET" ? "bg-daun-tint text-daun-2" : "bg-detak-tint text-detak"}`}>{m}</span>
                </td>
                <td className="py-2 pr-3 font-mono text-xs">{p}</td>
                <td className="py-2 text-ink-2">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 font-mono text-xs leading-relaxed text-night-ink">{`curl -X POST $HOST/api/ip -H 'content-type: application/json' -d '{
  "scenario": "tersentuh",
  "readings": [
    { "at": "2026-10-26T06:30:00+07:00", "foodC": 66, "ambientC": 30 },
    { "at": "2026-10-26T08:10:00+07:00", "foodC": 44, "ambientC": 31 }
  ],
  "until": "2026-10-26T11:00:00+07:00",
  "projectAmbientC": 31
}'`}</pre>
      </section>

      <section id="data" className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5" data-tour="data">
          <h2 className="text-xl font-bold">Data pilot dan sumbernya</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-y border-line bg-paper text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3">Provinsi</th>
                <th className="py-2 pr-3 text-right">SPPG</th>
                <th className="py-2 pr-3 text-right">Penerima / SPPG</th>
                <th className="py-2 text-right">Kab/kota</th>
              </tr>
            </thead>
            <tbody>
              {PROVINCES.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="py-2 pr-3 font-semibold">{p.name}</td>
                  <td className="py-2 pr-3 text-right font-mono">{p.sppg}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmtInt(p.beneficiariesPerSppg)}</td>
                  <td className="py-2 text-right font-mono">{p.regencies.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-daun">Sebaran SPPG per kab/kota</summary>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
              {PROVINCES.map((p) => {
                const alloc = allocateSppg(p);
                return (
                  <ul key={p.id} className="text-xs">
                    <li className="mb-1 font-bold">{p.short}</li>
                    {p.regencies.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2 border-b border-line/50 py-0.5">
                        <span>
                          {r.name}
                          {r.popSrc === "est" ? <span className="text-muted"> *</span> : null}
                        </span>
                        <span className="font-mono">{alloc.get(r.id)}</span>
                      </li>
                    ))}
                  </ul>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">* penduduk estimasi tim; dipakai hanya untuk membagi total SPPG provinsi.</p>
          </details>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-bold">Sumber</h2>
          <ul className="mt-3 grid gap-2 text-xs leading-relaxed">
            {Object.entries(SOURCES)
              .filter(([k]) => k !== "est")
              .map(([k, s]) => (
                <li key={k}>
                  {s.url ? (
                    <a href={s.url} className="text-daun underline" target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  ) : (
                    s.label
                  )}
                </li>
              ))}
            <li className="text-muted">Simulasi: dapur, sekolah, jadwal, dan pembacaan suhu dibangkitkan deterministik (seed tetap) dari angka di atas; laju lewat ambang dikalibrasi ±1–2,5% batch, selaras p₀ 2% kartu kendali.</li>
          </ul>
        </div>
      </section>

      <section id="faq" className="mt-6 card p-5" data-tour="faq">
        <h2 className="text-xl font-bold">Pertanyaan yang sering muncul</h2>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-line px-4 py-3 open:bg-paper-2">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Tour
        id="implementasi-v2"
        steps={[
          { target: "arch", title: "Bagaimana datanya mengalir", body: <>Termometer dan sensor → API DETAK → empat layar. Kotak hitam = bagian yang masih disimulasikan.</> },
          { target: "roles", title: "Hak akses dijaga di server", body: <>Tiap titik cek hanya bisa dicatat pihak yang ada di sana, dicek di server.</> },
          { target: "slo", title: "Skala dan target", body: <>Beban pilot dan nasional, dengan target kecepatan dan ketersediaan.</> },
          { target: "api", title: "Bisa dipakai modul lain", body: <>Semua layar memakai API ini. <b>/api/ip</b> bisa dipanggil modul lain tanpa menyimpan data.</> },
          { target: "faq", title: "Pertanyaan yang sering muncul", body: <>Pemalsuan data, sinyal, biaya, privasi, dan batas model.</> },
        ]}
      />
    </main>
  );
}
