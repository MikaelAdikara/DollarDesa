/**
 * Reference data for the DETAK pilot (Jan–Jun 2027 in the proposal).
 * Every figure carries a `src` key that resolves in SOURCES so the UI can cite it.
 * Figures marked `est` are allocation inputs we could not verify per regency; they only
 * decide how a province's (real) SPPG total is spread across its regencies.
 */

export type ClusterName = "Tinggi" | "Sedang" | "Rendah";
export type ProvinceId = "DIY" | "PAPUA" | "SUMBAR";

export const SOURCES = {
  bgnJun26: { label: "BGN via Tribunnews/Goodstats, data 8–9 Jun 2026 (jumlah SPPG per provinsi)", url: "https://data.goodstats.id/statistic/10-provinsi-dengan-sppg-terbanyak-juni-2026-jawa-barat-di-puncak-xO1Qt" },
  djpbDiy: { label: "Kanwil DJPb DIY: 402 SPPG aktif, 888.963 penerima (akhir Mei 2026)", url: "https://djpb.kemenkeu.go.id/kanwil/diy/id/data-publikasi/189-berita/4210-ini-realisasi-program-strategis-nasional-di-diy-hingga-akhir-mei-2026,-dari-mbg-hingga-koperasi-desa-merah-putih.html" },
  kppnSolok: { label: "KPPN Solok: 369 SPPG, 979.615 penerima Sumatera Barat (27 Mar 2026)", url: "https://djpb.kemenkeu.go.id/kppn/solok/id/data-publikasi/berita-terbaru/3536-press-release-apbn-periode-februari-tahun-2026.html" },
  papuaBgn: { label: "Kepala BGN ke Presiden: target ±2.500 SPPG, ±750 ribu penerima di tanah Papua (Des 2025)", url: "https://investortrust.id/national/88831/kepala-bgn-lapor-ke-prabowo-anggaran-mbg-di-papua-membengkak-3-kali-lipat" },
  dukcapilDiy: { label: "Pemda DIY (Dukcapil), jumlah penduduk per kabupaten/kota 2025", url: "https://ppid.jogjaprov.go.id/informasi/unduh/114f3b8a-7d48-46a2-ab5c-d305e48c555a" },
  sp2020: { label: "BPS, Hasil Sensus Penduduk 2020 menurut kabupaten/kota", url: "https://sensus.bps.go.id/topik/tabular/sp2020/1/35/2" },
  bpsSumbarProj: { label: "BPS Sumatera Barat, proyeksi penduduk kabupaten/kota 2020–2035", url: "https://sumbar.bps.go.id/en/publication/2023/07/14/16a99cdee876ebeb4fde7ab4/proyeksi-penduduk-kabupaten-kota-provinsi-sumatera-barat-2020-2035.html" },
  bmkg2025: { label: "BMKG, suhu rata-rata Indonesia 2025: 27,05°C (115 stasiun)", url: "https://www.bmkg.go.id/iklim/anomali-suhu-udara-rata-rata-tahun-2025" },
  detakData: { label: "Paket data DETAK (Tim DollarDesa, 2026): klaster, AHP–SAW, insiden", url: "https://github.com/MikaelAdikara/DollarDesa/tree/main/data" },
  bgn4jam: { label: "BGN, SIPERS-281/BGN/08/2026: batas konsumsi 4 jam setelah matang", url: "https://www.bgn.go.id/news/siaran-pers/siaran-pers-kepala-badan-gizi-nasional/maksimal-4-jam-batas-aman-konsumsi-mbg" },
  sopPendinginan: { label: "ANTARA, SOP Pendinginan BGN No. 015/05/00/SOP.15/09/2026", url: "https://www.antaranews.com/berita/5781678" },
  est: { label: "Estimasi tim untuk alokasi (belum terverifikasi per kabupaten); total provinsi tetap angka BGN", url: "" },
} as const;
export type SourceKey = keyof typeof SOURCES;

export interface Regency {
  id: string; // Kemendagri code
  name: string;
  population: number;
  popSrc: SourceKey;
  lon: number;
  lat: number;
  /** Typical daytime ambient temperature (°C) used to seed room/box sensor readings. */
  ambientC: number;
  /** 0 (urban, short routes) .. 1 (remote, long boat/road legs). */
  remoteness: number;
  /** Sub-district names used to label kitchens (real kapanewon/kecamatan where known). */
  districts: string[];
}

export interface Province {
  id: ProvinceId;
  name: string;
  short: string;
  cluster: ClusterName;
  /** Timezone offset from UTC in hours: WIB +7, WIT +9. */
  tzOffset: number;
  tzLabel: "WIB" | "WIT";
  sppg: number;
  sppgSrc: SourceKey;
  beneficiariesPerSppg: number;
  beneficiariesSrc: SourceKey;
  ahpSaw: number;
  incidentRatePer100: number;
  suspendPct: number;
  remotenessIndex: number;
  regencies: Regency[];
}

export const PROVINCES: Province[] = [
  {
    id: "DIY",
    name: "Daerah Istimewa Yogyakarta",
    short: "DI Yogyakarta",
    cluster: "Tinggi",
    tzOffset: 7,
    tzLabel: "WIB",
    sppg: 461,
    sppgSrc: "bgnJun26",
    beneficiariesPerSppg: Math.round(888963 / 402),
    beneficiariesSrc: "djpbDiy",
    ahpSaw: 0.754,
    incidentRatePer100: 0.184,
    suspendPct: 9.2,
    remotenessIndex: 0,
    regencies: [
      { id: "3404", name: "Sleman", population: 1135496, popSrc: "dukcapilDiy", lon: 110.355, lat: -7.716, ambientC: 28.5, remoteness: 0.1, districts: ["Depok", "Mlati", "Gamping", "Ngaglik", "Kalasan", "Berbah", "Prambanan", "Godean", "Seyegan", "Sleman", "Ngemplak", "Cangkringan", "Pakem", "Turi", "Tempel", "Minggir", "Moyudan"] },
      { id: "3402", name: "Bantul", population: 985142, popSrc: "dukcapilDiy", lon: 110.329, lat: -7.888, ambientC: 28.8, remoteness: 0.15, districts: ["Kasihan", "Sewon", "Banguntapan", "Bantul", "Imogiri", "Pleret", "Piyungan", "Pandak", "Bambanglipuro", "Jetis", "Pundong", "Kretek", "Srandakan", "Sanden", "Pajangan", "Sedayu", "Dlingo"] },
      { id: "3403", name: "Gunungkidul", population: 780806, popSrc: "dukcapilDiy", lon: 110.601, lat: -7.965, ambientC: 27.6, remoteness: 0.35, districts: ["Wonosari", "Playen", "Karangmojo", "Semanu", "Ponjong", "Patuk", "Nglipar", "Semin", "Ngawen", "Gedangsari", "Paliyan", "Tepus", "Tanjungsari", "Saptosari", "Panggang", "Purwosari", "Rongkop", "Girisubo"] },
      { id: "3401", name: "Kulon Progo", population: 445318, popSrc: "dukcapilDiy", lon: 110.158, lat: -7.857, ambientC: 28.6, remoteness: 0.3, districts: ["Wates", "Pengasih", "Sentolo", "Nanggulan", "Galur", "Lendah", "Temon", "Panjatan", "Kokap", "Girimulyo", "Samigaluh", "Kalibawang"] },
      { id: "3471", name: "Kota Yogyakarta", population: 415779, popSrc: "dukcapilDiy", lon: 110.37, lat: -7.797, ambientC: 29.2, remoteness: 0, districts: ["Gondokusuman", "Umbulharjo", "Mergangsan", "Kotagede", "Danurejan", "Jetis", "Tegalrejo", "Wirobrajan", "Mantrijeron", "Kraton", "Gondomanan", "Ngampilan", "Gedongtengen"] },
    ],
  },
  {
    id: "PAPUA",
    name: "Papua",
    short: "Papua",
    cluster: "Sedang",
    tzOffset: 9,
    tzLabel: "WIT",
    sppg: 92,
    sppgSrc: "bgnJun26",
    beneficiariesPerSppg: 1700,
    beneficiariesSrc: "est",
    ahpSaw: 0.59,
    incidentRatePer100: 0.106,
    suspendPct: 7.4,
    remotenessIndex: 1,
    regencies: [
      { id: "9471", name: "Kota Jayapura", population: 398478, popSrc: "sp2020", lon: 140.717, lat: -2.533, ambientC: 29.4, remoteness: 0.25, districts: ["Abepura", "Heram", "Jayapura Selatan", "Jayapura Utara", "Muara Tami"] },
      { id: "9403", name: "Jayapura", population: 166171, popSrc: "sp2020", lon: 140.51, lat: -2.565, ambientC: 28.6, remoteness: 0.55, districts: ["Sentani", "Sentani Timur", "Waibu", "Kemtuk", "Nimboran", "Depapre", "Demta", "Unurum Guay"] },
      { id: "9409", name: "Biak Numfor", population: 134650, popSrc: "sp2020", lon: 136.08, lat: -1.18, ambientC: 28.8, remoteness: 0.7, districts: ["Biak Kota", "Samofa", "Yendidori", "Biak Timur", "Numfor Barat", "Warsa"] },
      { id: "9405", name: "Kepulauan Yapen", population: 112676, popSrc: "sp2020", lon: 136.24, lat: -1.88, ambientC: 28.7, remoteness: 0.75, districts: ["Serui", "Yapen Selatan", "Yapen Timur", "Angkaisera", "Kosiwo"] },
      { id: "9419", name: "Keerom", population: 61600, popSrc: "est", lon: 140.79, lat: -2.93, ambientC: 28.3, remoteness: 0.7, districts: ["Arso", "Skanto", "Waris", "Senggi"] },
      { id: "9408", name: "Sarmi", population: 41500, popSrc: "est", lon: 138.74, lat: -1.86, ambientC: 28.5, remoteness: 0.85, districts: ["Sarmi", "Pantai Timur", "Bonggo"] },
      { id: "9427", name: "Mamberamo Raya", population: 36500, popSrc: "est", lon: 137.79, lat: -2.13, ambientC: 28.9, remoteness: 1, districts: ["Mamberamo Tengah", "Mamberamo Hilir"] },
      { id: "9426", name: "Waropen", population: 33900, popSrc: "est", lon: 136.45, lat: -2.01, ambientC: 28.6, remoteness: 0.9, districts: ["Waropen Bawah", "Urei Faisei"] },
      { id: "9428", name: "Supiori", population: 22500, popSrc: "est", lon: 135.6, lat: -0.73, ambientC: 28.7, remoteness: 0.95, districts: ["Supiori Selatan", "Supiori Utara"] },
    ],
  },
  {
    id: "SUMBAR",
    name: "Sumatera Barat",
    short: "Sumatera Barat",
    cluster: "Rendah",
    tzOffset: 7,
    tzLabel: "WIB",
    sppg: 446,
    sppgSrc: "bgnJun26",
    beneficiariesPerSppg: Math.round(979615 / 369),
    beneficiariesSrc: "kppnSolok",
    ahpSaw: 0.322,
    incidentRatePer100: 0.088,
    suspendPct: 2.3,
    remotenessIndex: 0.2,
    regencies: [
      { id: "1371", name: "Kota Padang", population: 909040, popSrc: "sp2020", lon: 100.354, lat: -0.95, ambientC: 28.9, remoteness: 0.05, districts: ["Koto Tangah", "Kuranji", "Lubuk Begalung", "Padang Utara", "Padang Timur", "Nanggalo", "Pauh", "Lubuk Kilangan", "Bungus Teluk Kabung"] },
      { id: "1306", name: "Agam", population: 551893, popSrc: "bpsSumbarProj", lon: 100.06, lat: -0.31, ambientC: 26.4, remoteness: 0.35, districts: ["Lubuk Basung", "Tilatang Kamang", "Banuhampu", "Palupuh", "Matur", "Ampek Angkek", "Tanjung Mutiara"] },
      { id: "1301", name: "Pesisir Selatan", population: 525360, popSrc: "bpsSumbarProj", lon: 100.57, lat: -1.35, ambientC: 28.7, remoteness: 0.4, districts: ["Painan", "Batang Kapas", "Lengayang", "Pancung Soal", "Linggo Sari Baganti", "Basa Ampek Balai Tapan"] },
      { id: "1305", name: "Padang Pariaman", population: 451388, popSrc: "bpsSumbarProj", lon: 100.21, lat: -0.62, ambientC: 28.6, remoteness: 0.2, districts: ["Lubuk Alung", "Sintuk Toboh Gadang", "Batang Anai", "Nan Sabaris", "VII Koto", "Sungai Limau"] },
      { id: "1312", name: "Pasaman Barat", population: 431000, popSrc: "est", lon: 99.83, lat: 0.11, ambientC: 28.4, remoteness: 0.45, districts: ["Pasaman", "Kinali", "Luhak Nan Duo", "Sungai Beremas", "Lembah Melintang"] },
      { id: "1302", name: "Solok", population: 391000, popSrc: "est", lon: 100.73, lat: -0.85, ambientC: 24.8, remoteness: 0.35, districts: ["Gunung Talang", "Kubung", "X Koto Singkarak", "Lembang Jaya", "Bukit Sundi"] },
      { id: "1307", name: "Lima Puluh Kota", population: 383000, popSrc: "est", lon: 100.68, lat: -0.15, ambientC: 25.6, remoteness: 0.4, districts: ["Harau", "Guguak", "Luak", "Suliki", "Pangkalan Koto Baru"] },
      { id: "1304", name: "Tanah Datar", population: 371000, popSrc: "est", lon: 100.59, lat: -0.46, ambientC: 24.9, remoteness: 0.3, districts: ["Lima Kaum", "Pariangan", "Rambatan", "Sungai Tarab", "Salimpaung"] },
      { id: "1308", name: "Pasaman", population: 299000, popSrc: "est", lon: 100.17, lat: 0.14, ambientC: 26.2, remoteness: 0.55, districts: ["Lubuk Sikaping", "Rao", "Bonjol", "Panti", "Tigo Nagari"] },
      { id: "1303", name: "Sijunjung", population: 235000, popSrc: "est", lon: 100.95, lat: -0.69, ambientC: 27.4, remoteness: 0.5, districts: ["Muaro Sijunjung", "Kupitan", "Koto VII", "Tanjung Gadang"] },
      { id: "1310", name: "Dharmasraya", population: 228000, popSrc: "est", lon: 101.38, lat: -1.04, ambientC: 28.5, remoteness: 0.5, districts: ["Pulau Punjung", "Sitiung", "Koto Baru", "Timpeh"] },
      { id: "1311", name: "Solok Selatan", population: 182000, popSrc: "est", lon: 101.24, lat: -1.48, ambientC: 25.3, remoteness: 0.6, districts: ["Sungai Pagu", "Sangir", "Koto Parik Gadang Diateh"] },
      { id: "1376", name: "Kota Payakumbuh", population: 139000, popSrc: "est", lon: 100.63, lat: -0.22, ambientC: 26.0, remoteness: 0.05, districts: ["Payakumbuh Barat", "Payakumbuh Timur", "Lamposi Tigo Nagari"] },
      { id: "1375", name: "Kota Bukittinggi", population: 121000, popSrc: "est", lon: 100.369, lat: -0.305, ambientC: 24.2, remoteness: 0.05, districts: ["Guguk Panjang", "Mandiangin Koto Selayan", "Aur Birugo Tigo Baleh"] },
      { id: "1377", name: "Kota Pariaman", population: 94000, popSrc: "est", lon: 100.12, lat: -0.626, ambientC: 28.8, remoteness: 0.05, districts: ["Pariaman Tengah", "Pariaman Utara", "Pariaman Selatan"] },
      { id: "1309", name: "Kepulauan Mentawai", population: 87000, popSrc: "est", lon: 99.59, lat: -2.03, ambientC: 28.3, remoteness: 0.95, districts: ["Sipora Utara", "Siberut Selatan", "Pagai Utara"] },
      { id: "1372", name: "Kota Solok", population: 73000, popSrc: "est", lon: 100.66, lat: -0.79, ambientC: 25.2, remoteness: 0.05, districts: ["Lubuk Sikarah", "Tanjung Harapan"] },
      { id: "1373", name: "Kota Sawahlunto", population: 65000, popSrc: "est", lon: 100.78, lat: -0.68, ambientC: 26.6, remoteness: 0.1, districts: ["Lembah Segar", "Talawi", "Barangin"] },
      { id: "1374", name: "Kota Padang Panjang", population: 56000, popSrc: "est", lon: 100.4, lat: -0.46, ambientC: 23.4, remoteness: 0.05, districts: ["Padang Panjang Barat", "Padang Panjang Timur"] },
    ],
  },
];

/** Documented incidents inside the pilot provinces (01_data/02_insiden_terdokumentasi.csv). */
export const PILOT_INCIDENTS = [
  { date: "2025-08-27", province: "DIY" as ProvinceId, regencyId: "3404", place: "SMPN 3 Berbah, Sleman", victims: 137, gap: "5,5 jam (masak 07.30, santap 12.00)", src: "harianjogja.com 28/8/2025" },
  { date: "2026-08-05", province: "PAPUA" as ProvinceId, regencyId: "9403", place: "RSUD Yowari, Kab. Jayapura", victims: 80, gap: "16 jam (masak 19.00, saji 11.00)", src: "republika.co.id 8/2026" },
  { date: "2026-08-19", province: "DIY" as ProvinceId, regencyId: "3401", place: "SMKN 1 Nanggulan, Kulon Progo", victims: 176, gap: "tidak dilaporkan", src: "kompas.com 19/8/2026" },
  { date: "2026-08-31", province: "DIY" as ProvinceId, regencyId: "3404", place: "SDN Nyaen dsk, Sleman", victims: 28, gap: "tidak dilaporkan", src: "detik.com 31/8/2026" },
  { date: "2026-09-01", province: "SUMBAR" as ProvinceId, regencyId: "1306", place: "SPPG Palupuh, Agam", victims: 340, gap: "tidak dilaporkan", src: "kompas.com 2/9/2026" },
];

/** National context shown on the BGN dashboard (deck / poster figures). */
export const NATIONAL = {
  sppg: 29991,
  provinces: 38,
  beneficiaries: 61.2e6,
  baselineVictimsPerMillionPortions: 1.93,
  victimsCumulative: 43838,
  victimsProjectedEnd2026: 51280,
  clusters: { Tinggi: 7, Sedang: 21, Rendah: 10 },
  silhouette: 0.461,
  moranI: -0.089,
  moranP: 0.5,
  investmentRp: 5.1e9,
  pilotInvestmentRp: 170e6,
  lossScenariosRp: [25.04e9, 30.15e9, 40.38e9],
  sensorRp: 20000,
  thermometerRp: 50000,
} as const;

export const PILOT_TOTAL_SPPG = PROVINCES.reduce((s, p) => s + p.sppg, 0); // 999

export function provinceById(id: string): Province | undefined {
  return PROVINCES.find((p) => p.id === id.toUpperCase());
}

export function regencyById(id: string): { province: Province; regency: Regency } | undefined {
  for (const p of PROVINCES) {
    const r = p.regencies.find((x) => x.id === id);
    if (r) return { province: p, regency: r };
  }
  return undefined;
}

/** Largest-remainder allocation of a province's SPPG count across regencies by population. */
export function allocateSppg(p: Province): Map<string, number> {
  const total = p.regencies.reduce((s, r) => s + r.population, 0);
  const raw = p.regencies.map((r) => ({ id: r.id, exact: (p.sppg * r.population) / total }));
  const out = new Map(raw.map((r) => [r.id, Math.max(1, Math.floor(r.exact))]));
  let left = p.sppg - [...out.values()].reduce((a, b) => a + b, 0);
  const order = [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) out.set(order[i].id, (out.get(order[i].id) ?? 0) + 1);
  while (left < 0) {
    const big = [...out.entries()].sort((a, b) => b[1] - a[1])[0];
    out.set(big[0], big[1] - 1);
    left++;
  }
  return out;
}
