# MicroMate — Personal Asset & Maintenance Manager

MicroMate adalah aplikasi manajemen siklus hidup aset pribadi: kelola aset,
servis, pengingat, biaya (TCO), dan dokumen dalam satu tempat. Data utama
disimpan lokal di perangkat (IndexedDB, dengan fallback localStorage), dan
opsional disinkronkan ke Google Sheets / Google Drive milik pengguna sendiri
lewat Google Apps Script.

Tidak ada API key AI yang dibutuhkan untuk menjalankan aplikasi ini.

## Menjalankan lokal

Prasyarat: Node.js.

```bash
npm install
npm run dev
```

Lalu buka alamat yang ditampilkan di terminal (default `http://localhost:3000`).
`npm run dev` menjalankan `server.ts`, yang memakai Vite middleware di mode
development.

## Build production

```bash
npm run build
npm start
```

`npm run build` menghasilkan `dist/` (frontend Vite) dan `dist/server.cjs`.
`npm start` menjalankan server production dari `dist/server.cjs`.

## PWA (Progressive Web App)

Build production sudah mendukung PWA:

- Manifest (`manifest.webmanifest`) dihasilkan saat build oleh
  `vite-plugin-pwa`, dengan nama MicroMate, ikon 192/512, dan ikon maskable.
- Service worker (Workbox) di-precache hanya untuk app shell (HTML, JS, CSS
  hasil build). Service worker **tidak** diaktifkan di mode development.
- Semua traffic API selalu NetworkOnly dan tidak pernah di-cache: request ke
  Apps Script, proxy `/api/exec`, dan file Google Drive. Data aset, antrean
  sync, dan dokumen harus selalu segar.
- Update versi tidak pernah reload otomatis. Saat service worker baru siap,
  aplikasi menampilkan banner "Versi baru tersedia" dan pengguna memilih
  kapan memuat ulang. Kalau antrean sync masih berisi perubahan, banner akan
  menampilkannya dan meminta konfirmasi sebelum reload.

Untuk install: di Android, Chrome akan menawarkan "Install" setelah kriteria
PWA terpenuhi (manifest, service worker, ikon, dan HTTPS). Di iOS Safari,
gunakan Share > Add to Home Screen. Pengujian PWA harus dilakukan pada build
production, bukan pada dev server.

## Sinkronisasi (opsional)

Sinkronisasi ke Google Sheets / Drive dikonfigurasi dari dalam aplikasi
(Settings), dengan URL Web App Apps Script milik pengguna. Tanpa konfigurasi
ini, aplikasi tetap bisa dipakai penuh secara lokal/offline. Perhatian: PIN
aplikasi hanya kunci tampilan, bukan enkripsi data — data lokal tetap bisa
dibaca lewat DevTools browser.

## Struktur singkat

- `src/App.tsx` — routing hash (`#/landing`, `#/setup`, `#/app`) dan shell aplikasi.
- `src/lib/db.ts` — IndexedDB (`MicroMateDB`) dan antrean sync.
- `src/lib/appsScriptCode.ts` — kode gateway Apps Script yang ditampilkan
  di onboarding/dokumentasi untuk disalin pengguna.
- `api/index.ts` — proxy Express untuk Apps Script (dipakai juga oleh `server.ts`).
- `vercel.json` — rewrite SPA dan `/api` untuk deployment Vercel.
