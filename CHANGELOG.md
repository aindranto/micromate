# Changelog

## 0.2.6.2 — Perbaiki temuan audit anti-slop fase 1 (em dash, huruf besar, jargon)

Fase 1 dari perbaikan bertahap atas audit anti-slop 7 Nov 2026 (temuan
1–3 dari 9). Hanya perbaikan teks dan label — tidak ada perubahan model
data, sync engine, PIN, demo seeding, navigasi, atau layout. Temuan 4–9
dikerjakan di fase berikutnya, bukan di versi ini.

- Em dash (R-02): semua em dash pada teks yang dilihat pengguna diganti
  koma/titik dua — subheadline landing ("...dan pajak yang mendekat,
  sebelum terlambat."), hero dashboard ("Paling mendesak: ..."),
  subheading Reminder Center ("...yang jatuh tempo, dari semua aset."),
  label opsi aset di form servis ("Nama (Kategori) [B 1234 ABC]"),
  opsi "Tanpa Aset Khusus (Pengingat Global)", dan 5 nama suite di
  Uji Kontrak (TEST A–E: " — " → ": "). Em dash di komentar kode
  dibiarkan.
- Huruf besar (R-06): class `uppercase` (+ `tracking-wider`/`tracking-wide`
  yang berpasangan) dihapus dari semua label — badge status, heading
  grup Terlambat/Mendatang, "Aksi Cepat", header tabel Pengaturan,
  label kanal notifikasi, label statistik, badge kategori, dan seluruh
  label formulir tambah aset. Label kini tampil sesuai penulisannya
  (akronim tetap kapital: PIN, OTP, JSON, TCO, STNK). Nilai mentah
  yang tadinya tampil apa adanya kini dipetakan ke label: id kategori
  ("device" → "Device" via `getCategoryLabel`), status bisnis
  ("AKTIF" → "Aktif"), tipe servis ("routine_service" → "Servis
  Berkala / Tune Up" via `MAINTENANCE_TYPE_LABELS`), tipe dokumen
  ("warranty_card" → "Kartu Garansi" via helper baru
  `getDocumentTypeLabel` di `documentDomain.ts`), status antrean
  sinkronisasi ("FAILED_RETRYABLE" → "Butuh coba ulang"), dan status
  registrasi SIM ("unregistered" → "Belum Terdaftar"). Kanal
  notifikasi kini "In-app", "Push", "Email". Satu-satunya `uppercase`
  yang dipertahankan: input plat nomor di Step2Specs (transformasi
  tampilan fungsional saat mengetik, bukan label).
- Jargon (R-16/R-36): "mekanisme retry otomatis berstandar enterprise"
  → "mekanisme coba ulang otomatis" (FIFO tetap, dijelaskan "antrean
  berurutan"); FAQ "akan di-hydrate otomatis" → "akan dimuat otomatis";
  "Sinkronisasi 2 Arah (Unified Sync)" → "Sinkronisasi 2 Arah"; pill
  "Task-Oriented" di heading Reminder Center dihapus; badge "JSON
  Engine" → "JSON"; label penghitung antrean "Sedang Retry" → "Butuh
  Coba Ulang". "toolchain" tidak ditemukan di kode — teks perbandingan
  di landing sudah berbunyi "tanpa terkunci platform" (kutipan audit
  ternyata keliru). Jargon di komentar kode, nama komponen di halaman
  dokumentasi, dan nama data uji dibiarkan.

Verifikasi: lint (`tsc --noEmit`) lolos; test sync-queue 11/11;
test demo-seed 4/4; build lolos (JS utama 612.675 byte / gzip
131.498 byte, CSS 106.596 byte, precache 17 entri / 995,12 KiB).

## 0.2.6.1 — Bersih-bersih menu duplikat (logo sidebar, ikon navbar, prop mati)

Sisa dari bersih-bersih menu duplikat yang dilaporkan Agung 6 Nov 2026
(butir 3–5 dari temuan, plus prop mati). Di v0.2.6 sudah digabung
\"Pusat Perhatian\" ke \"Reminder Center\" dan dihapus tombol cepat hero;
versi ini menyelesaikan sisanya. Tidak ada perubahan model data, sync
engine, PIN, demo seeding, navigasi (tetap 7 item), atau Pengaturan.

- Logo/brand \"MicroMate\" di atas sidebar dihapus — brand sudah ada di
  navbar, jadi di desktop logo tidak lagi muncul dua kali bertumpuk.
  Sidebar kini langsung dimulai tombol \"Tambah Aset Baru\", lalu
  \"Navigasi utama\". Perilaku sticky sidebar tidak berubah
  (`top-16`, tinggi header tetap h-16).
- Ikon gear Pengaturan di navbar (desktop) dihapus — Pengaturan tetap
  bisa dibuka dari item sidebar \"Pengaturan\", BottomNav \"Pengaturan\",
  dan tombol kontekstual di dalam popover sinkronisasi (\"Kelola
  Integrasi Storage\"), yang tetap memanggil `onOpenSettings`.
- Ikon buku \"Panduan & Docs\" di navbar dihapus — Panduan & Docs tetap
  bisa dibuka dari item sidebar. Prop `onNavigateDocs` dihapus dari
  Navbar beserta pass-through-nya di App.
- Prop mati `onQuickAddAsset` dihapus dari Navbar (dideklarasikan tapi
  tidak pernah di-render di sana). Prop `onQuickAddAsset` di
  AssetList, DocumentationPage, Dashboard, dan BottomNav TIDAK disentuh
  — semuanya masih dipakai (tombol tambah aset di halaman-halaman itu
  dan menu \"+\" di HP).

## 0.2.6 — Dashboard attention-first + refresh landing

Tahap 3 dari redesign bertahap (v0.2.4 fondasi → v0.2.5 navigasi →
v0.2.6 dashboard attention-first + landing). Termasuk bersih-bersih
menu duplikat yang dilaporkan Agung 6 Nov 2026: "Pusat Perhatian"
digabung ke "Reminder Center". Tidak ada perubahan model data, sync
engine, PIN, demo seeding, atau Pengaturan.

- Dashboard kini attention-first. Hero "Ringkasan Aset Hari Ini"
  diganti hero yang dipimpin perhatian: bila ada butir perhatian, hero
  menyebut jumlahnya dan butir paling mendesak beserta teks jatuh
  temponya ("Paling mendesak — ... (Terlambat 3 hari)."); bila tidak
  ada, hero tenang: "Semua terkendali". Section "Perlu Perhatian"
  (pengelompokan Terlambat lalu Mendatang dari v0.2.4, dengan aksi
  Detail Aset dan Selesaikan) kini menjadi section konten pertama di
  bawah hero; kartu KPI menjadi overview di bawah perhatian. Empty
  state berbingkai (perhatian, aset, perawatan) beserta aksinya tetap.
- Tombol cepat hero (Aset Baru / Servis / Reminder) dihapus dari
  Dashboard — ketiganya sudah ada di tombol sidebar "Tambah Aset Baru"
  (desktop) dan menu "+" (FAB) di HP. FAB dan tombol sidebar tidak
  diubah. Prop tambah Dashboard tetap dipakai empty state di bawah.
- "Pusat Perhatian" digabung ke "Reminder Center" (satu rumah
  perhatian + pengingat). Halaman Reminder Center kini punya section
  "Perlu Perhatian" di atas daftar pengingat, dari sumber yang sama
  dengan strip Dashboard (`getNeedsAttentionItems`): pengingat jatuh
  tempo, garansi, pajak STNK, dan oli — dikelompokkan Terlambat (rose,
  badge jumlah) lalu Mendatang (amber, badge jumlah), dengan kartu dan
  aksi yang sama (Detail Aset, Selesaikan untuk pengingat). Section ini
  tidak terpengaruh filter tab; filter hanya memengaruhi daftar
  pengingat di bawahnya. Judul halaman disamakan dengan label nav:
  "Reminder Hub" → "Reminder Center".
- Navigasi 8 → 7 item: entri `'attention'` dihapus dari
  `src/lib/navigation.ts`; cabang tab `'attention'` di `App.tsx`
  dihapus beserta import-nya. Badge jumlah perhatian pindah ke
  "Reminder Center" di sidebar (sumber hitungan sama) dan tetap di
  "Reminder" di BottomNav. Tidak ada lagi referensi ke id tab
  `'attention'` di seluruh `src/`.
- Sub-sistem "Attention Intelligence" yang hanya hidup di balik tab
  lama dihapus (15 file, semuanya yatim setelah tab dicabut —
  terverifikasi tidak ada importir lain): `src/components/attention/`
  (5 file: AttentionDashboardPage, FleetAttentionOverview,
  AssetAttentionCard, ActionResolverCTA, EvidenceDisclosureModal),
  `src/components/workflow/` (3 modal: WorkflowExecutionModal,
  DocumentRenewalResolverModal, CostTrendReviewModal),
  `src/hooks/useWorkflowGateway.ts`, `src/lib/attentionSignalEngine.ts`,
  `src/lib/attentionPresentationAdapter.ts`,
  `src/lib/workflowExecutionGateway.ts`,
  `src/lib/workflowStateMachine.ts`,
  `src/lib/coordinatedMutationService.ts`,
  `src/lib/documentRenewalCoordinatedService.ts`. Konsekuensi yang
  dicatat: aksi workflow dari halaman lama (resolver perpanjangan
  dokumen berbasis bukti, review tren biaya, gateway eksekusi
  workflow) ikut terhapus — semuanya hanya bisa dijangkau dari tab
  itu. Datanya tidak hilang: pengingat, garansi, pajak, dan oli tetap
  muncul di Reminder Center dan strip Dashboard. File-file ini bisa
  dipulihkan dari git bila suatu hari dibutuhkan.
- Landing refresh (copy + mockup saja, tanpa redesign struktural).
  Hero kini memimpin dengan manfaat perhatian: judul "Tahu Duluan Apa
  yang Perlu Perhatian" dan subheadline tentang garansi/servis/pajak
  yang diingatkan sebelum terlambat. Kartu mockup diurutkan ulang
  sehingga kartu perhatian ("Status Garansi — 2 Perlu Perhatian")
  menjadi yang pertama; caption mockup menyebut dashboard yang
  mengutamakan perhatian. Mockup tetap berlabel data contoh, bukan
  data pengguna. Gradient yang sudah ada di landing tidak disentuh
  (di luar scope refresh ini).
- Tidak diubah: model data, sync engine, PIN, demo seeding, halaman
  Pengaturan, item BottomNav (Dashboard, Aset, Reminder, Pengaturan),
  blok brand sidebar, dan ikon Navbar.

## 0.2.5.1 — Perbaiki scroll Pengaturan di HP + label versi

Patch atas v0.2.5, dari laporan langsung di HP: halaman Pengaturan tidak
bisa di-scroll ke bawah, jadi tidak semua section terjangkau (Zona Bahaya
di bawah tidak kelihatan). Juga menambah label versi di Pengaturan.

- Akar masalah scroll: `SettingsModal` mengunci scroll body
  (`document.body.style.overflow = 'hidden'`) setiap kali terbuka — efek
  yang benar untuk mode modal overlay, tapi ikut jalan di mode halaman
  penuh (`asPage`, v0.2.5). Saat Pengaturan dibuka sebagai halaman, body
  terkunci dan halaman tidak bisa di-scroll. Di desktop tidak ketahuan
  karena konten Pengaturan yang terlipat muat dalam satu viewport tinggi;
  di HP konten yang sama lebih tinggi dari viewport sehingga kunci scroll
  langsung terasa dan Zona Bahaya tidak terjangkau. Perbaikan: efek
  kunci-scroll kini dilewati bila `asPage` (hanya jalan di mode modal).
  `<main overflow-hidden>` tidak diubah — bukan penyebabnya (main
  menyesuaikan tinggi konten; Dashboard dan Aset yang memakai `<main>`
  yang sama tetap bisa di-scroll di HP).
- Label versi: baris kecil "MicroMate v0.2.5.1" di bawah Zona Bahaya,
  hanya di mode halaman. Versi dibaca dari `package.json` (JSON import
  + `resolveJsonModule` di tsconfig) agar selalu sama dengan rilis.

## 0.2.5 — Navigasi sidebar + Pengaturan sebagai halaman

Tahap 2 dari redesign bertahap (v0.2.4 fondasi → v0.2.5 navigasi sidebar
→ v0.2.6 dashboard attention-first + landing). Tidak ada perubahan
model data, sync, PIN, demo seeding, atau fitur baru — hanya navigasi.

- Satu sumber kebenaran navigasi (`src/lib/navigation.ts`): sidebar
  desktop dan BottomNav membaca daftar item yang sama (id, label,
  label pendek HP, ikon, kelompok), jadi label dan urutan tidak bisa
  melenceng. BottomNav menampilkan Dashboard, Aset, Reminder,
  Pengaturan dalam urutan sidebar yang sama.
- Sidebar desktop (lg ke atas): branding MicroMate di atas (kotak
  emerald-900 + nama), tombol "Tambah Aset Baru" tetap, label grup
  menjadi sentence case ("Navigasi utama"), "Pengaturan" sebagai
  kelompok terpisah di bawah dengan garis pemisah, dan sidebar kini
  sticky (`top-16`, tinggi viewport dikurangi Navbar) sehingga tetap
  terlihat saat konten di-scroll. Active state tetap pill netral.
- BottomNav HP: 4 item dari daftar bersama (ikon disamakan dengan
  sidebar: LayoutDashboard, Package, Bell, Settings); "Pengaturan"
  kini membuka halaman Pengaturan, bukan modal. FAB "+" dan menu aksi
  cepat tidak diubah. Badge jumlah perhatian tetap di Reminder (HP
  tidak punya slot Pusat Perhatian).
- Pengaturan kini halaman penuh (tab `'settings'`), bukan modal:
  `SettingsModal` mendapat prop `asPage` — hanya 3 div pembungkus
  luar yang berubah class (tanpa overlay, tanpa tinggi tetap, konten
  ikut scroll halaman). Semua section (profil/PIN, storage & sync +
  OTP, impor/ekspor, kategori, Zona Bahaya) dan semua handler tidak
  disentuh; perilaku reset, sync, PIN, dan demo seeding tidak berubah.
  Semua pintu masuk Pengaturan (sidebar, BottomNav, tombol gerigi
  Navbar, popover sync, Panduan & Docs) menuju tab yang sama.
  Mode modal dipertahankan di kode tapi tidak lagi dipakai pintu masuk
  mana pun.
- Banner demo ("Data contoh aktif") dipindah keluar dari `<header>`
  sticky Navbar: tinggi header kini konstan (h-16 di lg) sehingga
  offset sidebar sticky selalu benar; banner ikut ter-scroll dan
  tidak lagi menimpa toast sync.
- Versi package menjadi 0.2.5.

## 0.2.4.1 — Perbaiki toast update + data demo setup

Patch kecil (2 perbaikan, tanpa perubahan layout, model data, sync, PIN, atau fitur baru).

- Toast update PWA tidak lagi tertutup tombol aksi cepat ("+"): banner
  dipindah ke atas tombol (`bottom-40 sm:bottom-44 lg:bottom-28`,
  jarak 24/24/16px dari ujung atas tombol), jadi "Muat ulang" dan
  "Nanti" selalu bisa diklik dan teks tidak lagi tertutup.
- Bug data demo diperbaiki: pilihan "Gunakan Data Contoh (Demo Assets)"
  di setup kini benar-benar memunculkan 4 aset demo di dashboard.
  Akar masalah: pilihan "demo" tidak pernah menulis data apa pun —
  data demo hanya muncul lewat seeding satu kali di init yang terkunci
  flag `micromate_db_seeded`, jadi setelah data demo pernah dihapus,
  pilihan "demo" tidak bisa mengembalikannya. Kini
  `DatabaseManager.seedDemoData()` menulis ulang aset demo yang hilang
  (idempotent, tanpa menyentuh aset pengguna) saat setup selesai.
- Tes regresi baru `src/tests/demo-seed-smoke.test.ts`
  (`npm run test:demo-seed`): reproduksi bug, idempotensi, dan aset
  pengguna yang tetap utuh.
- Versi package menjadi 0.2.4.1.

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
