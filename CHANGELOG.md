# Changelog

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
