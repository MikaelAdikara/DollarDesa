# DETAK · Deteksi Risiko, Setiap Detik

Prototipe implementasi **DETAK**, modul ke-8 SIPGN (Sistem Informasi Pemenuhan Gizi Nasional) untuk Program Makan Bergizi Gratis. DETAK mengubah suhu dan waktu setiap batch makanan menjadi satu angka, **Indeks Paparan (IP)**, lalu mengirim status *Aman · Waspada · Buang* ke dapur, guru, orang tua, Dinas, dan BGN sebelum makanan disantap.

Tim DollarDesa · NSC26-IG039 · Lomba Infografis National Statistics Challenge 2026, Universitas Brawijaya.

## Layar

| Rute | Untuk | Isi |
|---|---|---|
| `/` | semua | Jam bakteri batch yang sedang berjalan, denyut pilot hari ini, peta klaster |
| `/dapur` · `/dapur/[id]` | Petugas SPPG | Batch hari ini, catat suhu titik Matang & Berangkat, label QR untuk boks, kartu kendali p |
| `/sekolah` · `/cek/[batchId]` | Guru & orang tua | Satu angka dan satu warna, aman sampai jam berapa, perjalanan suhu, catat titik Tiba & Pra-konsumsi, tahan batch |
| `/dinas` | Dinas / Satgas | Peringatan dini + jendela tindakan, tahan batch, peta dapur, sebaran IP, ritme operasi, antrean inspeksi AHP–SAW |
| `/bgn` | BGN pusat | Tiga indikator keberhasilan pilot, corong porsi, perbandingan antar klaster, biaya |
| `/metode` | penilai teknis | Simulator Monte Carlo interaktif, uji balik 5 kasus nyata dihitung ulang, daftar asumsi |
| `/implementasi` | penilai teknis | Arsitektur, hak akses, beban & SLO, katalog API, sumber data, FAQ |

Setiap layar punya **panduan spotlight** (tombol *Panduan layar ini*) dan ikon **i** untuk definisi setiap angka.

## Model

Indeks Paparan = pertumbuhan *Bacillus cereus* yang terkumpul ÷ 3 log (10² → 10⁵ CFU/g).

1. Pendinginan Newton dari suhu terukur ke suhu ruang; laju pendinginan *k* dihitung dari dua pembacaan berturut-turut.
2. Laju tumbuh Ratkowsky (a = 0,022; b = 0,424; Tmin = −2,568 °C; Tmax = 47,108 °C; Dong dkk. 2025).
3. Fase lag Baranyi (h₀ 0,5–1,7) sebagai pengurang kerja terkumpul.
4. Status memakai persentil ke-95: Aman < 0,8 ≤ Waspada < 1,0 ≤ Buang.
5. Batas yang dipakai adalah yang lebih dulu habis: batas IP atau aturan 4 jam BGN.

Kode: [`src/lib/model/ip.ts`](src/lib/model/ip.ts). Tes mereproduksi hasil uji balik paket data (`data/03_uji_balik_indeks_paparan.csv`) dan tabel jam bakteri (`data/04_jam_bakteri.csv`).

## Data

* **Nyata:** jumlah SPPG per provinsi pilot (BGN, Juni 2026: DIY 461, Papua 92, Sumatera Barat 446), penerima per SPPG (Kemenkeu DJPb), penduduk per kab/kota (Dukcapil DIY 2025, BPS SP2020 & proyeksi), insiden terdokumentasi, klaster K-Means 38 provinsi, bobot AHP–SAW, parameter model. Lihat [`src/lib/pilot/reference.ts`](src/lib/pilot/reference.ts) dan folder [`data/`](data).
* **Disimulasikan:** daftar dapur dan sekolah, rencana distribusi, dan pembacaan suhu harian. Dibangkitkan deterministik (seed tetap) dari angka nyata di atas sampai terhubung ke SIPGN dan perangkat lapangan. Laju batch lewat ambang dikalibrasi ±1–2,5%, selaras p₀ 2% kartu kendali.

Di luar jam layanan (05.00–14.00 WIB, Senin–Jumat) aplikasi memutar ulang hari sekolah terakhir pada pukul 10.15 WIB. Jam bisa diganti dari pemilih di kanan atas atau lewat `?t=HH:MM`.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 27 tes model & engine
npm run build
```

## Deploy ke Vercel

1. Import repositori ini di Vercel (framework Next.js terdeteksi otomatis).
2. Tanpa variabel lingkungan apa pun aplikasi sudah berjalan penuh. Tindakan pengunjung (catat suhu, tahan batch) tersimpan per pengunjung.
3. Opsional, agar tindakan dibagi antar pengunjung: buat database Postgres (Neon / Supabase / Vercel Postgres), jalankan [`db/schema.sql`](db/schema.sql), lalu isi `DATABASE_URL`.

## API

| Metode | Rute | Fungsi |
|---|---|---|
| GET | `/api/health` | status layanan |
| GET | `/api/pilot/summary` | ringkasan hari ini per provinsi |
| GET | `/api/kitchens?province=DIY&regency=3404` | daftar SPPG |
| GET | `/api/kitchens/{id}` | satu SPPG, batch hari ini, kartu kendali p |
| GET | `/api/batches/{id}` | status batch, jalur suhu & IP |
| POST | `/api/batches/{id}/readings` | catat suhu titik 1–4 (peran dicek per titik) |
| POST | `/api/batches/{id}/actions` | tahan, lepas, catat inspeksi |
| GET | `/api/alerts?province=DIY` | peringatan dini |
| GET | `/api/inspections?province=DIY` | antrean inspeksi AHP–SAW |
| POST | `/api/ip` | kalkulator Indeks Paparan tanpa simpan |

## Struktur

```
src/lib/model      Indeks Paparan (Newton + Ratkowsky + lag + Monte Carlo)
src/lib/pilot      data referensi pilot, simulasi harian, engine keputusan
src/lib/store      penyimpanan kejadian (memori atau Postgres)
src/app            layar dan route API
data/              paket data terbuka DETAK (CSV, pemisah titik koma)
research/          skrip analisis Python (uji balik, klaster, AHP–SAW, proyeksi)
db/schema.sql      skema Postgres (append-only)
```
