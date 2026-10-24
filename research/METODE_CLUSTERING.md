# METODE ANALISIS KLASTER (K-MEANS)
Sistem DETAK · Infografis NSC 2026 · blok 6 pada poster

---

## 1. Pertanyaan yang dijawab

"Apakah wilayah di Indonesia dapat dikelompokkan menurut profil risiko pengelolaan MBG,
dan seperti apa ciri tiap kelompok?"

Perhatikan bahwa pertanyaannya **bukan** "wilayah mana yang paling berbahaya". Analisis ini
mengelompokkan **kondisi pengelolaan**, bukan memvonis tingkat bahaya. Pembedaan ini penting
dan dibahas di bagian 7.

---

## 2. Data yang dipakai

Unit analisis: **38 provinsi** (sesuai jumlah provinsi Indonesia setelah pemekaran Papua).

| Peubah | Isi | Sumber | Berkas |
|---|---|---|---|
| Riwayat insiden | Kejadian keracunan per 100 SPPG, sudah disusutkan | Kompilasi media 15 kejadian | `01_provinsi.csv` |
| Laju suspend | Persentase SPPG disuspend di wilayah itu | BGN via Databoks, 29 Mei 2026 | `01_provinsi.csv` |
| Skala beban | Jumlah SPPG provinsi, dalam bentuk logaritma | BGN, 8 Juni 2026 | `01_provinsi.csv` |
| Keterpencilan | Indeks 0 sampai 1 berbasis pulau | Disusun sendiri | `01_provinsi.csv` |

**Tiga peubah yang sengaja TIDAK dipakai:** suhu per provinsi, waktu distribusi, dan jarak tempuh.
Ketiganya tidak dipublikasikan per provinsi oleh lembaga mana pun. BMKG hanya menerbitkan agregat
nasional. Kami memilih tidak memakainya daripada menambal dengan tebakan.

---

## 3. Langkah perhitungan

**Langkah 1. Penyusutan laju insiden (empirical Bayes).**
Provinsi berpenyebut kecil tampak ekstrem hanya karena kebetulan. Papua dengan satu kejadian dari
92 dapur menghasilkan laju mentah 1,09 per 100 SPPG, tertinggi nasional, padahal itu satu kejadian.

Model Poisson-Gamma:

    laju_posterior = (kejadian + alpha) / (jumlah_dapur + beta)

dengan `alpha` = 1/1,247 diambil dari parameter dispersi regresi Binomial Negatif, dan
`beta` = alpha / laju_nasional. Hasilnya Kalimantan Tengah menyusut 86%, sedangkan Jawa Tengah
yang punya 4.592 dapur hanya menyusut 11% karena datanya memang sudah banyak.

**Langkah 2. Standardisasi.**
Keempat peubah punya satuan berbeda (persen, jumlah, indeks). Masing-masing diubah ke skor-z:

    z = (x - rata-rata) / simpangan baku

Jumlah SPPG dilogaritmakan lebih dulu karena sebarannya sangat menceng (dari 14 di Papua
Pegunungan sampai 6.721 di Jawa Barat).

**Langkah 3. K-Means, k = 3.**
Jumlah klaster ditetapkan tiga agar hasilnya dapat dibaca sebagai rendah, sedang, tinggi.
Algoritma dijalankan dari **60 inisialisasi acak** yang berbeda, lalu dipilih yang menghasilkan
inersia (jumlah kuadrat jarak ke pusat klaster) terkecil. Ini mencegah hasil tersangkut di
optimum lokal.

**Langkah 4. Uji mutu klaster (silhouette).**
Untuk tiap provinsi dihitung:

    s = (b - a) / max(a, b)

dengan `a` rata-rata jarak ke anggota klaster sendiri dan `b` rata-rata jarak ke klaster terdekat
lainnya. Nilai mendekati 1 berarti pengelompokan tegas.

**Hasil: silhouette = 0.461.** Nilai di atas 0,4 lazim dibaca sebagai struktur yang
cukup jelas, bukan pengelompokan paksa.

**Langkah 5. Pengurutan klaster.**
K-Means memberi nomor klaster secara acak. Kami mengurutkannya dari rata-rata skor-z terendah ke
tertinggi agar label Rendah, Sedang, Tinggi punya arti yang konsisten.

---

## 4. Hasil

| Klaster | Jumlah provinsi | Insiden per 100 SPPG | Dapur disuspend | Rata-rata dapur | Keterpencilan |
|---|---|---|---|---|---|
| Risiko Rendah | 10 | 0.045 | 2.3% | 639 | 0.20 |
| Risiko Sedang | 21 | 0.050 | 7.4% | 216 | 0.67 |
| Risiko Tinggi | 7 | 0.071 | 8.9% | 2725 | 0.06 |

**Risiko Rendah (10 provinsi):** Aceh, Sumatera Utara, Sumatera Barat, Riau, Kepulauan Riau, Jambi, Sumatera Selatan, Kepulauan Bangka Belitung, Bengkulu, Lampung.
Seluruhnya Sumatera. Beban pengelolaan sedang, tetapi laju suspend paling rendah, 2,3%.

**Risiko Sedang (21 provinsi):** Bali, Nusa Tenggara Barat, Nusa Tenggara Timur, Kalimantan Barat, Kalimantan Tengah, Kalimantan Selatan, Kalimantan Timur, Kalimantan Utara, Sulawesi Utara, Gorontalo, Sulawesi Tengah, Sulawesi Barat, Sulawesi Tenggara, Maluku, Maluku Utara, Papua, Papua Barat, Papua Barat Daya, Papua Tengah, Papua Selatan, Papua Pegunungan.
Wilayah timur dan Kalimantan. Dapurnya paling sedikit tetapi paling terpencil.

**Risiko Tinggi (7 provinsi):** Banten, DKI Jakarta, Jawa Barat, Jawa Tengah, DI Yogyakarta, Jawa Timur, Sulawesi Selatan.
Didominasi Jawa. Beban pengelolaan terbesar dan laju suspend tertinggi.

---

## 5. Catatan penting tentang jumlah anggota klaster

Poster menampilkan pembagian **6 / 22 / 10**. Perhitungan ulang dengan seluruh 38 provinsi pada
berkas ini menghasilkan **7 / 21 / 10**.
Selisihnya satu provinsi yang berpindah antara Sedang dan Tinggi, yaitu provinsi di batas antar
klaster. K-Means memang peka pada kasus di perbatasan.

**Sebelum dicetak, samakan salah satu.** Angka pada poster dan pada berkas data tidak boleh berbeda.

---

## 6. Mengapa K-Means, bukan metode lain

K-Means dipilih karena tiga alasan. Pertama, peubahnya numerik seluruhnya, sehingga cocok untuk
metode berbasis jarak. Kedua, jumlah klaster yang diinginkan sudah ditetapkan sejak awal (tiga
tingkat risiko), sehingga tidak perlu metode hierarkis. Ketiga, hasilnya mudah dijelaskan ke
pembaca awam lewat profil rata-rata tiap klaster.

Kelemahannya: K-Means mengasumsikan klaster berbentuk bulat dan berukuran mirip. Dengan Jawa yang
sangat berbeda skalanya, asumsi itu tidak sepenuhnya terpenuhi. Karena itu silhouette dilaporkan
apa adanya, tidak disembunyikan.

---

## 7. Batas tafsir yang kami akui

**Klaster ini TIDAK membuktikan wilayah tertentu lebih berbahaya.** Uji terpisah pada berkas
`09_hasil_statistik.csv` menunjukkan:

- Moran's I = −0,089 dengan p = 0,50 → tidak ada bukti pengelompokan spasial
- IRR Jawa = 2,32 dengan selang kepercayaan 0,45 sampai 12,00 → belum terbukti berbeda
- Korelasi Spearman antara skor risiko struktural dan insiden teramati = 0,265 dengan p = 0,130
  → profil wilayah tidak meramalkan insiden secara signifikan

Ketiga hasil itu menunjuk arah yang sama: **risiko melekat pada proses, bukan pada wilayah.**
Klaster berguna untuk menyesuaikan cara pengawasan, bukan untuk menuding daerah.

Keterbatasan lain: data insiden hanya 15 kejadian yang terdokumentasi media, bukan sensus, dan
liputan media condong ke Jawa. Artinya klaster Tinggi kemungkinan sebagian terbentuk oleh
intensitas liputan, bukan semata oleh risiko sesungguhnya.

---

## 8. Cara menjalankan ulang

    python 02_kode/risiko.py

Keluaran: profil klaster, nilai silhouette, dan uji korelasi tidak sirkuler.
