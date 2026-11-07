# DESIGN_PLAN_V0264 — Audit-fix Fase 3 (temuan 7–9)

Versi: 0.2.6.4 — Perbaiki temuan audit anti-slop fase 3
Basis: v0.2.6.3 (commit 11a13d3). Delta saja, tidak ada perubahan
model data, sync engine, PIN, navigasi, atau desain visual di luar
yang disebut di sini. Dengan versi ini kesembilan temuan audit
anti-slop 7 Nov 2026 selesai diperbaiki.

## 1. Temuan 7 — Struktur landing (R-05/R-14)

Masalah: bagian fitur landing adalah 6 kartu seragam dalam satu grid
di bawah judul generik "Segala yang Anda Butuhkan untuk Mengelola
Aset" — bentuk template, walau isinya nyata.

Perbaikan (LandingPage.tsx saja):
- Judul bagian: "Catat, rawat, dan pantau aset Anda" (spesifik,
  sejalan dengan subjudul yang sudah ada: "mencatat, merawat, dan
  memantau").
- Enam kartu dibagi dua kelompok, masing-masing dengan subjudul
  kalimat biasa dan grid sendiri; teks dan tampilan kartu tidak
  berubah:
  - "Mencatat dan menyimpan": Katalog Aset Digital, Manajemen
    Garansi & Dokumen, Riwayat Servis & Total Cost (TCO).
  - "Mengingatkan dan menyinkronkan": Reminder & Pengingat
    Otomatis, Sinkronisasi Google Drive & Sheets, Akses Cepat
    Offline-First.
- Bagian "Cara Kerja" (3 langkah) dan FAQ dibiarkan: prosesnya
  nyata, pertanyaannya spesifik produk.

## 2. Temuan 8 — Hitungan Reminder Center (C-4)

### Investigasi

Halaman Reminder Center menampilkan dua angka dari dua sumber
berbeda tanpa penjelasan:
- Bagian "Perlu Perhatian": `getNeedsAttentionItems(assets)` —
  set gabungan: garansi, pajak, dan oli yang dihitung dari data
  aset, ditambah pengingat tersimpan yang jatuh tempo dalam 14 hari.
- Filter tab ("Semua", "Terlambat", "Mendatang", ...) dan daftar
  bawah: `enrichedReminders` — pengingat tersimpan saja.
Dengan data demo, bagian atas menghitung 7 item (Terlambat 6 /
Mendatang 1) sedangkan filter menghitung 4 pengingat — angka yang
tidak bisa direkonsiliasi pembaca dari halaman itu sendiri.

Butir "Mendatang tapi tertulis Terlambat 1 hari" dari laporan
audit tidak bisa direproduksi dari kode sekarang: untuk garansi,
pajak, dan pengingat tersimpan, label kelompok (`isOverdue`) dan
teks relatif (`daysDiff`) memakai nilai `days` yang sama, jadi
keduanya selalu sepakat. Satu-satunya cabang yang memakai dua
definisi berbeda adalah item oli (lihat di bawah). Judul yang
dikutip audit ("Perpanjangan TOP UP Carousel") juga tidak ada di
kode maupun riwayat git — lihat bagian 3.

### Perbaikan
- RemindersPage.tsx: satu baris penjelas di antara bagian "Perlu
  Perhatian" dan filter: "Angka pada bagian Perlu Perhatian
  menghitung garansi, pajak, oli, dan pengingat yang jatuh tempo.
  Filter di bawah ini menghitung pengingat yang tersimpan saja."
  Tidak ada refactor penggabungan dua dataset — keduanya memang
  punya fungsi berbeda (yang satu dihitung, yang satu disimpan).
- RemindersPage.tsx: judul daftar bawah "Jatuh Tempo (Overdue)"
  menjadi "Jatuh tempo (overdue)" (carry-over dari cek live
  v0.2.6.2; class uppercase sudah dicopot di fase 1, teks
  sumbernya sendiri masih title case).
- utils.ts `getNeedsAttentionItems`, cabang oli: `daysDiff` dihapus.
  Sebelumnya `daysDiff: Math.floor(kmRemaining / 50)` — kilometer
  yang disulap jadi hari ("Tinggal 50 km lagi" tampil sebagai
  "1 hari lagi"). Sekarang item oli tidak punya `daysDiff`; kartu
  hanya menampilkan judul berbasis km, dan pengelompokan memakai
  `isOverdue` berbasis km. Satu definisi saja.
- Dashboard.tsx: baris hero memakai konstanta `mostUrgentLine`
  baru — tanda kurung hanya muncul kalau ada teks relatif, supaya
  tidak tampil "(...)" kosong ketika item paling mendesak adalah
  item oli tanpa `daysDiff`.

Yang TIDAK diperbaiki: angka atas (7) dan angka filter (4) tetap
berbeda karena memang menghitung hal berbeda — sekarang dijelaskan
dengan baris penjelas, bukan disatukan. Penggabungan dua dataset
menjadi satu angka adalah refactor yang lebih besar dan mengubah
makna badge sidebar; tidak dilakukan di fase ini.

## 3. Temuan 9 — Kata data demo (seedData.ts)

- Duplikat STNK: pengingat tersimpan `rem_vario_tax` ("Jatuh Tempo
  Pajak STNK Tahunan (B 4982 SGF)", 25 Agu 2026) dihapus. Kartu
  yang sama sudah muncul otomatis dari
  `vehicle_details.annual_tax_date` ("Jatuh Tempo Pajak STNK Lewat
  (25 Agu 2026)"), sehingga pajak STNK tampil dua kali di Perlu
  Perhatian. Komentar penjelas ditambahkan di seed agar duplikat
  ini tidak dibuat lagi.
- Sengaja dibiarkan: pengingat oli tersimpan ("Ganti Oli Mesin
  Vario 160 (Target 12.500 km)") — pemicunya berbasis tanggal,
  sedangkan item oli turunan berbasis kilometer. Bukan duplikat
  yang sama; pengingat garansi MacBook tersimpan juga dibiarkan
  karena item garansi turunannya berada di luar jendela -30 hari
  (berakhir 15 Sep 2026) sehingga pengingat tersimpan itulah
  satu-satunya yang memunculkan garansi MacBook di Perlu Perhatian.
- Judul aneh "Kunci Butuh Pelayan (Service AC Daikin)" dan
  "Perpanjangan TOP UP Carousel": tidak ditemukan di mana pun di
  `src/` maupun riwayat git (`git log -S` kosong). Keduanya hanya
  ada di data demo lama yang tersimpan di profil browser saat
  audit — aset-asetnya (MacBook Pro 2019, Vario 150, AC Daikin)
  sudah tidak ada di data demo sekarang. Setup demo baru tidak
  mengandung judul tersebut. Versi ini tidak mengubah data lama
  yang sudah tersimpan di perangkat; data itu hanya berubah kalau
  pengguna reset dan memilih data demo lagi.

## Verifikasi

- Lint `tsc --noEmit`: lolos.
- Tes `test:sync-queue`: 11/11 lolos. Tes `test:demo-seed`: 4/4
  lolos (tes hanya menghitung aset demo, penghapusan satu
  pengingat tersimpan tidak memengaruhinya).
- Build `vite build`: lolos; preview `/`, manifest, `sw.js` 200.
- Grep: subjudul kelompok baru ada; "Jatuh tempo (overdue)"
  ada; judul aneh tidak ada di `src/`; `rem_vario_tax` tidak
  ada lagi di `seedData.ts`.
