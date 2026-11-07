# Rencana Desain v0.2.6.2 — Perbaiki temuan audit anti-slop fase 1

Fase 1 dari perbaikan bertahap atas audit anti-slop (mode After) 7 Nov
2026 terhadap Micromate v0.2.6.1. Fase ini hanya temuan 1–3; temuan 4–9
dikerjakan di fase berikutnya, bukan di versi ini. Bukan redesign
visual: tidak ada warna, token, tipografi, layout, atau perilaku baru.
Subjek: teks yang dilihat pengguna harus berbahasa Indonesia polos —
tanpa em dash, tanpa huruf besar semua, tanpa jargon.

## 1. Temuan 1 — Em dash (R-02)

Aturan anti-slop: em dash adalah tanda baca yang dipakai berlebihan
oleh AI; di teks pengguna diganti koma, titik dua, atau kalimat yang
direstrukturisasi — mana yang paling natural.

Yang diubah (semua teks yang dilihat pengguna):

| Lokasi | Lama | Baru |
| --- | --- | --- |
| LandingPage subheadline | "...dan pajak yang mendekat — sebelum terlambat." | "...dan pajak yang mendekat, sebelum terlambat." |
| Dashboard hero | "Paling mendesak — ..." | "Paling mendesak: ..." |
| RemindersPage subheading | "...yang jatuh tempo — dari semua aset" | "...yang jatuh tempo, dari semua aset" |
| AddMaintenanceModal, opsi aset | "Nama (Kategori) — [B 1234 ABC]" | "Nama (Kategori) [B 1234 ABC]" |
| AddReminderModal, opsi tanpa aset | "-- Tanpa Aset Khusus (Pengingat Global) --" | "Tanpa Aset Khusus (Pengingat Global)" |
| contractTests, 5 nama suite | "TEST A — ..." s.d. "TEST E — ..." | "TEST A: ..." s.d. "TEST E: ..." |

Nama suite Uji Kontrak ikut diubah karena dirender di UI Diagnostik
Pengaturan (`{suite.name}`) — jadi termasuk teks yang dilihat pengguna.
Satu em dash tambahan di nama check test demo-seed ("is idempotent —")
juga diganti titik dua agar hasil test bersih. Em dash di komentar kode
dibiarkan (PinLockModal, BottomNav, Navbar, Dashboard, RemindersPage,
useNotificationCenter, clientNotificationHandoff, tcoAnalyticsEngine,
komentar header test).

## 2. Temuan 2 — Huruf besar (R-06)

Aturan: label tidak boleh tampil huruf besar semua dengan spasi huruf
lebar (`uppercase` + `tracking-wider`/`tracking-wide`). Sebagian besar
teks sumber sudah ditulis title/sentence case, jadi menghapus class-nya
saja sudah cukup. Yang perlu dipetakan adalah nilai mentah (id/enum)
yang dirender apa adanya.

Dihapus `uppercase` (+ `tracking-*` berpasangan) dari ~70 tempat:
badge status & kategori, heading grup Terlambat/Mendatang/Hari Ini/
Selesai di Reminder Center, "Aksi Cepat" (BottomNav), header tabel dan
label kanal di Pengaturan, label statistik MaintenancePage & TCO,
seluruh label formulir tambah aset (Step 1–5), label detail aset,
label onboarding, dan badge demo. Akronim tetap kapital: PIN, OTP,
JSON, TCO, STNK.

Nilai mentah yang dipetakan ke label (sebelumnya tampil apa adanya):

- Kategori aset: `pendingAsset.category` (AddAssetModal) dan
  `asset.category` (AssetList) kini via `getCategoryLabel` — tadinya
  "device", kini "Device".
- Status bisnis: `getBusinessStatusConfig` (AssetList) dan
  `getBusinessStatusBadge` (AssetDetail) — label "AKTIF"/"DISERVIS"/
  "DISIMPAN"/"TERJUAL"/"DIBUANG" menjadi "Aktif"/"Diservis"/"Disimpan"/
  "Terjual"/"Dibuang"; default `s.toUpperCase()` menjadi kapital huruf
  pertama saja.
- Tipe servis: `AssetDetail` kini memakai `MAINTENANCE_TYPE_LABELS`
  dari `maintenanceDomain.ts` — tadinya id mentah seperti
  "routine_service", kini "Servis Berkala / Tune Up".
- Tipe dokumen: helper baru `getDocumentTypeLabel` di
  `documentDomain.ts` — "invoice" → "Invoice", "manual" → "Manual",
  "warranty" → "Garansi", "warranty_card" → "Kartu Garansi", "other" →
  "Lainnya", default kapital huruf pertama. Dipakai di AssetDetail
  (badge dokumen) dan ImageViewerModal (kategori media — mencakup
  kedua pemanggilnya, AssetList dan AssetDetail, karena pemetaan
  dilakukan di sisi viewer).
- Status antrean sinkronisasi (SettingsModal): enum mentah
  "PENDING"/"PROCESSING"/"FAILED_RETRYABLE"/"FAILED_PERMANENT" kini
  "Menunggu"/"Diproses"/"Butuh coba ulang"/"Gagal permanen", dipetakan
  dari boolean `isFailedPerm`/`isRetryable`/`isProcessing` yang sudah
  dihitung di baris yang sama.
- Status registrasi SIM (AssetDetail): cabang else yang tadinya
  menampilkan id mentah kini "Belum Terdaftar" ("registered" tetap
  "Terdaftar Dukcapil").
- Kanal notifikasi (SettingsModal): "In-App"/"Push"/"Email" menjadi
  "In-app"/"Push"/"Email" (termasuk header tabel "In-app (Feeds)").

Satu `uppercase` dipertahankan dengan sengaja: input plat nomor di
`Step2Specs.tsx:121` — itu transformasi tampilan fungsional saat
mengetik plat (plus `onChange` `toUpperCase()`), bukan label.

## 3. Temuan 3 — Jargon (R-16/R-36)

Jargon diganti bahasa Indonesia polos, tanpa mengubah makna:

| Lokasi | Lama | Baru |
| --- | --- | --- |
| SettingsModal, teks storage | "mekanisme retry otomatis berstandar enterprise" | "mekanisme coba ulang otomatis" |
| LandingPage, FAQ ganti HP | "akan di-hydrate otomatis" | "akan dimuat otomatis" |
| SettingsModal, blok sinkronisasi | "Sinkronisasi 2 Arah (Unified Sync)" | "Sinkronisasi 2 Arah" |
| RemindersPage, heading | pill "Task-Oriented" | pill dihapus seluruhnya |
| SettingsModal, badge Backup | "JSON Engine" | "JSON" |
| SettingsModal, penghitung antrean | "Sedang Retry" | "Butuh Coba Ulang" |

"FIFO" dipertahankan — istilah yang akurat untuk antrean, dan sudah
dijelaskan dengan "antrean berurutan" di kalimat yang sama.

Hasil sweep: "toolchain" tidak ditemukan di kode — teks perbandingan di
landing sudah berbunyi "tanpa terkunci platform", jadi kutipan audit
untuk butir ini ternyata keliru dan tidak ada yang diubah. Tidak ada
"seamless", "mutakhir", "revolusioner", atau "cutting-edge" di teks
pengguna. Yang dibiarkan dengan alasan: "Task-Oriented" dan "Unified"
di komentar kode; "hydrate"/"hydrated" sebagai nama fungsi/variabel
dan komentar di `clientNotificationHandoff.ts`/`db.ts`; "Reconciliation
Engine" dan "Offline-First Client Engine" sebagai nama komponen di
halaman dokumentasi (mengubahnya akan membuat docs tidak konsisten
dengan kode); "Enterprise" di nama data uji contractTests (bukan teks
pengguna).

## 4. Yang TIDAK diubah

- Temuan 4–9 (klaim perbandingan, gradien, ikon sparkle/emoji,
  bentuk template landing, inkonsistensi hitungan Reminder Center,
  wording data demo) — fase 2 dan 3.
- Model data, sync engine, PIN, demo seeding, navigasi (tetap 7 item),
  Pengaturan sebagai halaman, layout, warna, tipografi.
- Emoji sebagai ikon UI (⚠️📅🔵🟢 di heading grup Reminder Center,
  ☁️ di onboarding) — temuan 6, fase 2.
- Label yang sudah title case di sumber ("Harga Beli", "Total Biaya")
  dibiarkan apa adanya — menghapus class `uppercase` sudah membuat
  tampilannya normal; menulis ulang semua label ke sentence case
  murni akan menambah churn tanpa manfaat yang terlihat.

## 5. Verifikasi

- `tsc --noEmit` (lint): lolos.
- Test sync-queue: 11/11 lolos. Test demo-seed: 4/4 lolos.
- `vite build`: lolos (lihat CHANGELOG untuk ukuran bundle).
- `vite preview`: `/`, manifest, dan `sw.js` semua 200.
- Grep pasca-perubahan: nol `uppercase` di src/ kecuali input plat
  nomor; nol em dash di teks pengguna (sisa hanya di komentar kode);
  nol jargon dari daftar sweep di teks pengguna.
