# METODE PROYEKSI KORBAN
Sistem DETAK · Infografis NSC 2026 · blok 8 pada poster

---

## 1. Pertanyaan yang dijawab

"Bila tidak ada yang berubah, berapa banyak korban baru yang akan terjadi?"

Ini **skenario**, bukan ramalan. Perbedaannya penting: ramalan mencoba menebak masa depan,
skenario menghitung akibat bila kondisi sekarang dibiarkan.

---

## 2. Mengapa BUKAN ARIMA

Kami menolak memakai ARIMA, dan alasannya perlu dicatat karena sering ditanyakan.

**Pertama, datanya hanya tiga ruas.** JPPI merilis angka kumulatif, bukan bulanan. Sepanjang 2026
hanya tersedia tiga titik potong yang dapat dipakai. ARIMA membutuhkan puluhan pengamatan untuk
menduga parameter secara stabil.

**Kedua, jarak antar pengamatan tidak seragam.** Ruasnya 4,5 bulan, 2,7 bulan, dan 0,9 bulan.
ARIMA mensyaratkan interval yang sama. Yang kami punya adalah potongan kumulatif, bukan deret waktu.

**Ketiga, penyebutnya berubah-ubah.** Jumlah porsi yang disajikan terus naik dan sempat terhenti
saat libur sekolah. ARIMA memodelkan jumlah korban mentah, sehingga akan salah membaca lonjakan
paparan sebagai lonjakan risiko.

Bila dipaksakan, ARIMA akan menghasilkan angka berselang kepercayaan yang tampak meyakinkan
padahal tidak berdasar. Itu justru yang paling mudah dirobohkan penilai.

---

## 3. Model yang dipakai: Paparan Poisson

Gagasannya sederhana:

    korban = laju insidensi × jumlah porsi

Yang dimodelkan hanya satu hal: **paparannya bertambah, lajunya diasumsikan tetap.**

**Langkah 1. Hitung laju insidensi teramati 2026.**

| Ruas | Korban | Hari sekolah | Porsi | Laju per juta porsi |
|---|---|---|---|---|
| Jan – pertengahan Mei | 9.167 | 88 | 4,85 miliar | 1,89 |
| Pertengahan Mei – awal Agu | 3.489 | 40 | 2,20 miliar | 1,58 |
| Agustus | 3.079 | 20 | 1,10 miliar | **2,79** |
| **Gabungan** | **15.735** | **148** | **8,15 miliar** | **1,93** |

Porsi dihitung sebagai hari sekolah dikali 55,1 juta porsi per hari.
Agustus 45% di atas rata-rata, menandakan kenaikan mutakhir.

**Langkah 2. Tahan laju itu, kalikan paparan berikutnya.**
Untuk September sampai Desember 2026, dengan 70 hari sekolah:

    korban baru = 1,93 / 1.000.000 × (55,1 juta × 70 hari) = 7.442

**Langkah 3. Tambahkan ke angka kumulatif.**

    43.838 (JPPI, awal Sep 2026) + 7.442 = 51.280 korban pada awal 2027
    kenaikan = 7.442 / 43.838 = 16,97%

Inilah dua angka yang muncul di blok 8 poster.

**Langkah 4. Selang ketidakpastian.**
Dihitung dari sebaran Poisson dengan rata-rata sama dengan nilai proyeksi, memakai persentil
2,5 dan 97,5.

---

## 4. Skenario lain yang dihitung

Tidak semuanya muat di poster, tetapi seluruhnya ada di `13_proyeksi_korban.csv`.

| Skenario | Korban baru |
|---|---|
| Sep – Des 2026, laju dan skala tetap | 7.442 |
| Tahun ajaran 2027, laju tetap, skala tetap | 21.264 |
| Tahun ajaran 2027, laju tetap, skala naik ke 82,9 juta | 31.992 |
| Tahun ajaran 2027, laju Agustus, skala 82,9 juta | 46.325 |

**Bila DETAK berjalan**, dengan asumsi 60% insiden berjejak waktu-suhu dan tingkat tangkap 70%,
sekitar **13.437 korban dicegah** dari skenario ketiga.

---

## 5. Asumsi yang wajib disebut

1. **Laju insidensi dianggap tetap.** Ini asumsi paling besar. Bila pengawasan membaik, laju turun;
   bila program membesar tanpa perbaikan verifikasi, laju bisa naik seperti yang terjadi di Agustus.

2. **Hari sekolah diperkirakan.** Dipakai 200 hari per tahun ajaran dan 70 hari untuk Sep–Des.

3. **Porsi per hari dianggap 55,1 juta.** Angka Februari 2026 menyebut 61,2 juta penerima. Bila
   dipakai angka yang lebih besar, proyeksinya ikut naik secara proporsional.

4. **Angka kumulatif memakai JPPI (43.838).** Kemenkes mencatat 50.059 dengan metode berbeda.
   Bila memakai angka Kemenkes, dasar kumulatifnya berubah tetapi persentase kenaikannya serupa.

5. **Tahun 2025 tidak dipakai sebagai pembanding** karena porsi kumulatif pada masa perintisan
   tidak terdokumentasi cukup andal.

---

## 6. Cara membaca angka ini dengan jujur

Kenaikan dari 21 ribu ke 32 ribu pada tabel di bagian 4 **bukan** karena programnya memburuk,
melainkan karena porsinya bertambah dari 55,1 juta ke 82,9 juta. Memperbesar program tanpa
memperbaiki verifikasi berarti memperbesar korbannya secara proporsional. Kalimat ini penting
supaya nada karya tetap menyelamatkan program, bukan menyerangnya.

---

## 7. Cara menjalankan ulang

    python 02_kode/proyeksi.py

Keluaran: laju insidensi per ruas, empat skenario proyeksi beserta selang, dan skenario DETAK.
