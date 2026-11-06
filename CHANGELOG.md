# Changelog

## 0.2.4 — Fondasi desain: token, attention strip, empty state, breakpoint xs

Tahap 1 dari redesign bertahap (v0.2.4 fondasi → v0.2.5 navigasi sidebar
→ v0.2.6 dashboard attention-first + landing). Tidak ada perubahan
layout, model data, sync, PIN, atau fitur baru — hanya fondasi visual.

- Token desain di `src/index.css` (`@theme` Tailwind v4): skala tipe
  `text-display` (24px), `text-section` (18px), `text-subheading`
  (14px), `text-body` (14px/20px), `text-label` (12px), semuanya dari
  system sans stack (tanpa webfont eksternal, PWA tetap offline).
  Radius konsisten: hero 24px, section 16px, baris 12px, pill penuh.
- Perbaikan breakpoint `xs:` yang selama ini tidak berfungsi: Tailwind
  v4 tidak punya `xs` bawaan, jadi ditambahkan `--breakpoint-xs: 30rem`
  (480px) di `@theme`. Class `xs:` di Dashboard (5 pemakaian) dan
  AssetDetail (1 pemakaian, select status) sekarang menghasilkan CSS.
- Dashboard: kartu KPI memakai token tipe + radius `rounded-2xl` dan
  label Bahasa Indonesia ("Perangkat", "Kendaraan", "Rumah"); banner
  memakai token tipe. Section "Needs Attention" menjadi "Perlu
  Perhatian": item dikelompokkan Terlambat (rose) lalu Mendatang
  (amber) dengan header grup + jumlah, chip tanpa emoji dan tanpa
  all-caps, teks relatif sentence case ("Terlambat 3 hari",
  "Hari ini", "3 hari lagi"). Aksi satu klik tetap sama (Detail Aset,
  Selesaikan).
- Empty state baru (bingkai + ikon + aksi): dashboard tanpa aset
  ("Belum ada aset" → Tambah Aset), tanpa agenda mendesak
  ("Tidak ada agenda mendesak" → Tambah Reminder), tanpa riwayat
  servis ("Belum ada riwayat servis" → Catat Servis); AssetDetail
  tanpa riwayat/dokumen/servis ("Belum ada catatan riwayat",
  "Belum ada dokumen", "Belum ada riwayat servis") — semua sentence
  case, Bahasa Indonesia, data jujur (nol tetap nol, kosong tetap
  kosong).
- Versi package menjadi 0.2.4.

## 0.2.3 — Stepper tanpa MUI, bundle lebih ringan

- Stepper di AddAssetModal diganti dari Material UI ke Tailwind murni
  (`src/components/add-asset-steps/StepProgressBar.tsx` ditulis ulang):
  5 langkah, garis penghubung, dan status selesai/aktif/belum sama
  seperti sebelumnya; tampilan mobile (header langkah + progress bar)
  tidak berubah. Dependensi `@mui/material`, `@emotion/react`, dan
  `@emotion/styled` dihapus dari package.json (51 paket terhapus dari
  node_modules); `react-hook-form` tetap dipakai dan tidak tersentuh.
- Hasil build: bundle JS utama 701,85 kB (gzip 150,83 kB), precache
  17 entri / 1.088 KiB (sebelumnya 18 entri / 1.206 KiB di v0.2.2).
- Koreksi catatan v0.2.2: folder `src/components/documents/` berisi
  12 file, bukan 11 — total file mati yang dihapus tetap 13.
- Versi package menjadi 0.2.3.

## 0.2.2 — Tes sync pertama + bersih-bersih kode mati

- Tes sync pertama: `src/tests/sync-queue-smoke.test.ts` (11 pengecekan,
  jalan dengan `npm run test:sync-queue`). Menguji jalur antrean sync
  yang diperbaiki di 0.1.0: item tersimpan dengan status PENDING dan
  entity dari action, mutation_id yang sama hanya tersimpan sekali,
  jadwal backoff (5/15/60/120/300 detik), klasifikasi error retryable
  vs permanen, flush tanpa URL Apps Script, flush sukses, gagal karena
  jaringan (FAILED_RETRYABLE + backoff), HTTP 400 (FAILED_PERMANENT),
  pemulihan item PROCESSING yang macet lebih dari 60 detik, hapus item,
  dan reset item gagal ke PENDING. Tes memakai `tsx` seperti skrip
  `test:*` yang sudah ada, tanpa framework dan tanpa dependensi baru;
  localStorage dan fetch di-mock, IndexedDB tidak ada di Node sehingga
  yang diuji adalah jalur fallback localStorage — jalur yang sama
  dipakai aplikasi di browser tanpa IndexedDB.
- Bersih-bersih kode mati (13 file dihapus): seluruh folder
  `src/components/documents/` (12 file, termasuk duplikat
  AddDocumentModal dan DocumentVault) dan `src/lib/driveGatewayClient.ts`.
  Folder documents/ hanya terjangkau lewat DocumentVault, dan
  DocumentVault sendiri tidak pernah di-import dari mana pun, jadi
  seluruh folder itu kode mati. Alur dokumen yang dipakai aplikasi
  adalah `src/components/AddDocumentModal.tsx` lewat App.tsx dan
  tidak tersentuh. driveGatewayClient tidak di-import oleh file
  manapun dan membawa token default hardcode 'token_valid_123'.
  Semua file yang dihapus masih ada di riwayat git kalau suatu saat
  dibutuhkan lagi.
- Catatan jujur: sekitar 50 skrip `test:*` lain di package.json masih
  menunjuk ke file `src/tests/` yang tidak ada (warisan template);
  yang dibuat di rilis ini hanya suite kecil di atas, bukan pemulihan
  suite lama.
- Versi package menjadi 0.2.2.

## 0.2.1 — Label sentence case + badge

- Landing page: 4 label eyebrow dari Title Case menjadi sentence case
  ("Fitur lengkap", "Mengapa memilih MicroMate", "Alur penggunaan",
  "Pertanyaan umum"). Heading section dan label mockup tidak diubah.
- Badge "PRIVAT" di mockup menjadi "Privat"; badge "Rekomendasi Utama"
  tidak lagi dipaksa all-caps oleh class `uppercase` (teksnya memang
  sudah sentence case, yang diubah hanya class-nya).
- Footer: dicek ulang, ternyata bukan typo — kode `&copy;
  {new Date().getFullYear()} MicroMate.` sudah me-render "© 2026
  MicroMate." dengan spasi yang benar, jadi tidak diubah.
- Versi package menjadi 0.2.1.

## 0.2.0 — Desain dengan 2 skill yang disetujui (frontend-design + design-taste)

Skill yang dipakai adalah adaptasi untuk Muse dan Micromate, bukan install
repo aslinya, tanpa API key dan tanpa skrip Node dari taste-skill. Rencana
lengkapnya ada di `DESIGN_PLAN_V02.md`.

- Landing page: teks hero tidak lagi memakai gradasi, efek glow
  dekoratif dihapus, label eyebrow dan label stat mockup dari all-caps
  menjadi sentence case, dan mockup dashboard dilabeli jelas sebagai
  contoh tampilan dengan data contoh, bukan data pengguna.
- Dashboard: kartu KPI tidak lagi memakai ikon di kotak tinted; ikon
  menjadi netral dan inline, kartu tetap flat dengan border dan tanpa
  hover shadow, sesuai aturan app-screen bahwa KPI adalah tipografi,
  bukan ubin.
- `src/index.css`: token desain sebagai variabel CSS (emerald-900,
  stone, amber, rose), warna dasar body, focus keyboard yang terlihat,
  dan reduced-motion yang mematikan animasi masuk.
- Versi package menjadi 0.2.0.
- Batasan yang dicatat jujur: cek screenshot browser di 3 lebar tidak
  bisa dijalankan di lingkungan ini karena browser live menolak alamat
  loopback, padahal server production lokal menjawab 200. Penggantinya
  adalah audit visual dari kode dan build production. Cek screenshot
  di perangkat nyata setelah push ke hosting HTTPS masih outstanding
  (lihat `DESIGN_PLAN_V02.md`).

## 0.1.0 — PWA + perbaikan sync dan visual

### Diperbaiki

- **Laporan sync yang selalu "berhasil" (bug utama).** `App.tsx` dan
  `SettingsModal.tsx` mengecek hasil `flushSyncQueue()` seolah-olah boolean,
  padahal fungsi itu mengembalikan objek `{ success, processed, failed, ... }`
  di `src/lib/db.ts`. Objek selalu truthy, jadi cabang gagal tidak pernah
  jalan. Sekarang yang dicek adalah `.success`, kegagalan menampilkan
  `reason`-nya, dan hasil sebagian (sebagian item gagal) dilaporkan sebagai
  sebagian, bukan sukses penuh, tanpa mengosongkan antrean.
- **Antrean sync diabaikan pada sync 2 arah.** `SettingsModal`
  `handleTwoWaySync` sebelumnya tidak mengecek hasil flush sama sekali.
  Sekarang kegagalan flush dilaporkan eksplisit, walau pull dari cloud
  berhasil.

### PWA

- Manifest MicroMate (nama, deskripsi Indonesia, `lang: id`,
  `display: standalone`, `theme_color #064e3b`) dihasilkan oleh
  `vite-plugin-pwa` saat build.
- Ikon baru di `public/icons/`: 192, 512, maskable 512, dan
  apple-touch-icon 180, plus `public/favicon.svg`.
- Service worker Workbox: precache app shell saja; semua traffic Apps Script,
  `/api/exec`, dan Google Drive memakai NetworkOnly (tidak di-cache).
- Banner update versi: tidak ada reload otomatis. Pengguna memilih "Muat
  ulang" atau "Nanti", dan kalau antrean sync masih berisi perubahan,
  banner menampilkan jumlahnya dan meminta konfirmasi sebelum reload.
- Service worker dinonaktifkan di mode development.

### Branding dan visual

- `index.html`: `lang="id"`, judul "MicroMate — Personal Asset &
  Maintenance Manager", meta deskripsi, `theme-color`, dan meta iOS PWA.
- `package.json`: nama `micromate`, versi `0.1.0`. `metadata.json`: nama
  MicroMate, kemampuan Gemini yang tidak dipakai dihapus.
- README lama (template AI Studio, instruksi `GEMINI_API_KEY`) diganti
  dengan dokumentasi yang sesuai kode saat ini.
- Konten mobile tidak lagi tertutup BottomNav: `main` memakai `pb-24` di
  mobile dan kembali ke `pb-8` di desktop (BottomNav tersembunyi).
- Scrollbar tidak lagi disembunyikan secara global; hanya elemen yang
  memakai class `no-scrollbar` yang menyembunyikannya.
- Animasi `animate-in` / `fade-in` / `zoom-in` sekarang benar-benar jalan
  lewat `tw-animate-css` (sebelumnya plugin animasi tidak ada di Tailwind v4).
- `package-lock.json` diregenerasi: sebelumnya tidak memuat entri untuk
  `@mui/material`, `@emotion/*`, dan `react-hook-form` yang sudah ada di
  `package.json`.

### Sengaja tidak diubah di rilis ini

- Duplikasi `AddDocumentModal` (jalur `documents/` yang tidak terjangkau
  dari UI utama) dan pemakaian MUI hanya untuk satu Stepper: refactornya
  berisiko dan butuh keputusan terpisah.
- PIN aplikasi tetap kunci tampilan, bukan enkripsi data.
- Seluruh suite `test:*` di `package.json` masih menunjuk ke `src/tests/`
  yang tidak ada di repo; file test tidak ikut ter-commit dan tidak bisa
  dipulihkan dari repo ini.
