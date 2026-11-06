# Rencana desain v0.2.5 — Tahap 2 navigasi sidebar

Subjek, audiens, dan tugas layar (sama seperti v0.2.4): aset milik sendiri dan
perawatannya; audiens adalah pemilik yang mengecek apa yang butuh perhatian;
tugas aplikasi adalah menjawab apa yang butuh perhatian berikutnya, lalu
bertindak dalam satu klik. Tahap ini navigasi saja: sidebar desktop,
penyelarasan BottomNav, dan Pengaturan sebagai tujuan navigasi. Tidak ada
perubahan model data, sync, PIN, demo seeding, atau fitur baru.

Basis: origin/main 214c1db (v0.2.4.1, sudah di-push). Clone lokal sudah di
214c1db dan bersih (hanya CARA-PUSH.md, dist/, node_modules/ tak terlacak).

## Keadaan awal (dari kode, bukan tebakan)

- Sidebar desktop SUDAH ADA (`src/components/Sidebar.tsx`, `hidden lg:flex`,
  w-64): tombol "Tambah Aset Baru", daftar Dashboard, Pusat Perhatian
  (badge jumlah perhatian), Aset Saya, Perawatan & Servis, Reminder Center,
  Biaya & TCO, Panduan & Docs, dan kartu kaki "Offline-First Storage".
  Yang kurang: tidak ada branding MicroMate di sidebar, tidak ada entri
  Pengaturan, dan sidebar ikut ter-scroll bersama halaman (tidak sticky).
- BottomNav (`src/components/BottomNav.tsx`, `lg:hidden`) punya 4 item:
  Home (dashboard), Aset (assets), Reminder (reminders, badge perhatian),
  Pengaturan (membuka modal). Label dan ikonnya tidak sama dengan sidebar
  (House vs LayoutDashboard, Box vs Package, "Home" vs "Dashboard").
- Pengaturan HANYA ada sebagai modal (`src/components/SettingsModal.tsx`,
  2420 baris: profil/PIN, storage & sync + OTP, impor/ekspor, kategori,
  Zona Bahaya reset). Bukan tujuan navigasi: tidak punya tab, tidak bisa
  ditandai aktif di sidebar/BottomNav.

## Satu sumber kebenaran navigasi

Baru: `src/lib/navigation.ts` — satu daftar item yang dipakai sidebar
dan BottomNav, jadi label dan urutan tidak bisa melenceng lagi:

- Dashboard / Dashboard — LayoutDashboard — BottomNav: ya
- Pusat Perhatian / Perhatian — ShieldAlert (badge jumlah perhatian) — tidak
- Aset Saya / Aset — Package — ya
- Perawatan & Servis / Servis — Wrench — tidak
- Reminder Center / Reminder — Bell — ya
- Biaya & TCO / Biaya — PieChart — tidak
- Panduan & Docs / Panduan — BookOpen — tidak
- Pengaturan / Pengaturan — Settings — ya (kelompok sistem, bukan data)

BottomNav menampilkan 4 item dalam urutan sidebar yang sama: Dashboard,
Aset, Reminder, Pengaturan. Label pendek dipakai di HP hanya di mana label
penuh tidak muat ("Aset Saya" → "Aset", "Reminder Center" → "Reminder");
"Dashboard" dan "Pengaturan" sama persis di kedua tempat. Ikon disamakan
(LayoutDashboard dan Package dipakai di sidebar dan BottomNav).

Badge jumlah perhatian tetap di "Pusat Perhatian" (sidebar) dan di
"Reminder" (BottomNav): HP tidak punya slot Pusat Perhatian, jadi badge
menempel pada item terdekat yang mewakili hal yang sama (reminder adalah
pemicu perhatian). Jumlahnya sama di kedua tempat.

## Sidebar (desktop, lg ke atas)

- Branding di atas: kotak emerald-900 dengan ikon Box + "MicroMate" +
  "Personal Asset Vault" — tanda yang sama dengan Navbar, supaya sidebar
  punya identitas sendiri.
- "Tambah Aset Baru" tetap di atas (aksi utama satu klik, sesuai aturan
  layar kerja). Label grup "Navigasi Utama" menjadi sentence case
  ("Navigasi utama", tanpa uppercase/tracking) sesuai aturan penulisan.
- "Pengaturan" sebagai kelompok terpisah di bawah, dengan garis pemisah —
  ini tujuan sistem, bukan halaman data.
- Sticky: `sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto`.
  Sidebar tetap terlihat saat konten di-scroll (persisten), dan konten
  utama sudah ter-offset oleh layout flex (tidak ada yang tertutup sidebar).
  Tinggi 4rem cocok dengan Navbar di lg (h-16).
- Active state tetap pill netral yang sudah ada (bg-emerald-100/90,
  teks emerald-950) — bukan bar + pill + ikon berwarna (aturan 6).
- Kartu kaki "Offline-First Storage" dipertahankan.

## BottomNav (HP)

- 4 item dari daftar bersama, urutan sama dengan sidebar. Ikon dan label
  pendek dari daftar bersama. Pengaturan kini pindah ke tab Pengaturan
  (bukan membuka modal). FAB "+" dan menu aksi cepat tidak diubah.
- Padding bawah konten (`pb-24` di HP) sudah ada dan tidak diubah.

## Pengaturan sebagai halaman (keputusan: prop `asPage`, bukan rewrite)

SettingsModal adalah 2420 baris logika yang berjalan (OTP, PIN,
impor/ekspor, Zona Bahaya). Menulis ulang menjadi halaman baru berisiko
merusak perilaku sync/PIN/reset. Yang dipilih: prop opsional `asPage`
pada SettingsModal — hanya 3 div pembungkus luar yang berubah class:

- Modal: overlay `fixed inset-0` + panel `h-[620px] max-h-[92vh]`
  dengan scroll dalam.
- Halaman (`asPage`): tanpa overlay, panel menjadi blok `max-w-3xl`
  biasa di dalam `<main>`, konten ikut scroll halaman (tanpa
  `overflow-y-auto` dalam). Header (judul + tombol X), bar buka/tutup
  semua, dan SEMUA section + handler tidak disentuh.

`asPage` dipakai lewat tab baru `'settings'` di App.tsx. Semua pintu
masuk Pengaturan kini menuju tab yang sama: sidebar, BottomNav, tombol
gerigi Navbar, tombol "Kelola Integrasi Storage" di popover sync, dan
tombol di Panduan & Docs. Jalur tanpa URL Apps Script di sync manual
juga menuju tab ini (sebelumnya membuka modal). Tombol X di halaman
Pengaturan kembali ke Dashboard. Dua pemakaian `onClose` di dalam
modal yang bernavigasi (impor JSON berhasil → Dashboard; "Buka Setup
Wizard" → hash `#/setup/google`) tetap bekerja sama seperti saat modal
ditutup. Mode modal dipertahankan di kode tapi tidak lagi dipakai
pintu masuk mana pun (catatan untuk bersih-bersih nanti, bukan di
versi ini).

Perilaku yang TIDAK berubah: reset (`handleClearCacheAndReset`),
seed demo, PIN (visual lock), sync, dan semua section Pengaturan.

## Perubahan pendukung (kecil, beralasan)

Banner demo ("Data contoh aktif") dipindah keluar dari `<header>`
sticky Navbar menjadi sibling di bawahnya. Alasan: tinggi header
sticky harus konstan (h-16 di lg) karena offset sticky sidebar
(`top-16`) bergantung padanya; saat banner tampil di dalam header,
tinggi header bertambah dan ujung atas sidebar tertutup banner.
Efek samping yang ikut teratasi: toast sync (`fixed top-16`) tidak
lagi menimpa banner. Tampilan banner sendiri tidak berubah, hanya
ikut ter-scroll bersama halaman (tidak lagi menempel).

## Yang tidak diubah

Model data, sync engine, PIN, demo seeding, reset, dan semua halaman
isi (Dashboard, Aset, Servis, Reminder, Biaya, Panduan, Pusat
Perhatian). Tidak ada dependensi baru, tidak ada webfont eksternal,
tidak ada gradient.

## Review terhadap brief (sebelum membangun)

- Bukan default generik: tidak ada gradient, tidak ada all-caps (label
  grup diubah ke sentence case), warna hanya pada data (badge rose
  untuk perhatian), permukaan flat (border 1px, shadow maksimal 2xs).
- Boldness dipakai di satu tempat: branding emerald-900 di atas sidebar.
  Sisanya tenang dan disiplin.
- Navigasi surut: active state pill netral, label dan urutan sama di
  sidebar dan BottomNav.
- Tidak ada yang menyembunyikan state data: sync/error/PIN/reset
  tidak disentuh; Pengaturan sebagai halaman justru membuat status
  sync dan antrean lebih terlihat (tidak lagi di balik overlay).

## Verifikasi

`npm run lint` (tsc --noEmit), `npm run test:sync-queue` (11/11),
`npm run test:demo-seed` (4/4), `npm run build`, preview production
dan pastikan `/`, manifest, dan sw.js 200. Cek visual disarankan lewat
browser task (landing + dashboard + halaman Pengaturan di 1919px;
lebar kecil tetap butuh perangkat nyata).
