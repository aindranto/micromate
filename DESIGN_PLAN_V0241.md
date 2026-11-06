# Rencana v0.2.4.1 — Perbaiki toast update + data demo setup

Patch kecil (2 perbaikan, tanpa perubahan layout, model data, sync, PIN, atau fitur baru).

## Subjek

Aset milik pengguna dan perawatannya. Audiens: pemilik yang mengecek apa
yang perlu perhatian. Yang disentuh: banner update (notifikasi sementara)
dan alur setup awal (pengisian data pertama).

## Perbaikan 1 — Toast update tertutup tombol "+" (src/App.tsx)

- Masalah: banner update PWA (`fixed bottom-20 lg:bottom-6`) duduk di pita
  vertikal yang sama dengan tombol aksi cepat ("+") di BottomNav
  (`fixed bottom-20 / sm:bottom-22 / lg:bottom-8`, tinggi 56/64px).
  Ujung atas tombol: 136px (ponsel), 152px (sm), 96px (lg) dari bawah —
  tepat di area tombol banner, jadi "Muat ulang"/"Nanti" tidak bisa
  diklik dan teks tertutup.
- Perbaikan: naikkan banner di atas ujung atas tombol:
  `bottom-40 sm:bottom-44 lg:bottom-28` (160/176/112px → jarak 24/24/16px).
  Tampilan tetap sama (flat, stone-900/emerald, sentence case). Teks sudah
  wrap (tidak ada class truncate) — "terpotong" kemarin adalah tombol
  yang menutupinya, bukan CSS.
- Review: perubahan satu baris class, tidak menyentuh layout lain, tidak
  ada dependensi baru.

## Perbaikan 2 — Data demo tidak muncul setelah setup (src/lib/db.ts, src/App.tsx)

- Akar masalah (terbukti dari kode): pilihan "demo" di setup tidak pernah
  menulis data apa pun. `handleCompleteSetup` (App.tsx) tidak punya cabang
  untuk `demo` + local (dan untuk cloud hanya flush sync). Data demo hanya
  muncul lewat seeding satu kali di init (`ensureSeedData*`, db.ts), yang
  hanya jalan saat toko kosong DAN flag `micromate_db_seeded` belum 'true'.
  Begitu flag 'true' (terjadi sejak pertama kali aplikasi dibuka) dan data
  demo pernah dihapus (`clearDemoData` — dipakai pilihan "Data Kosong"),
  pilihan "demo" di setup berikutnya tidak bisa mengembalikan apa-apa →
  dashboard kosong.
- Perbaikan: tambah `DatabaseManager.seedDemoData()` — menulis ulang 4 aset
  demo (SEED_ASSETS) yang hilang saja, tanpa menyentuh aset pengguna
  (idempotent, pakai `saveAssetToDB` yang sudah ada, upsert per asset_id).
  Panggil dari `handleCompleteSetup` saat pilihan 'demo' (kedua mode;
  cloud tetap flush sync sesudahnya). Dataset demo tidak diubah.
- Review: tanpa perubahan model data (tidak ada field baru), tanpa wipe
  (berbeda dengan `resetData` yang mengosongkan semua), konsisten dengan
  jalur seed yang sudah ada.

## Verifikasi

Lint, test sync-queue 11/11, test baru demo-seed (reproduksi bug: flag
'true' + demo terhapus → seedDemoData mengembalikan 4 aset; idempotent;
aset pengguna utuh), build, preview 200. Cek visual toast di situs live
setelah push (browser tidak bisa membuka localhost).
