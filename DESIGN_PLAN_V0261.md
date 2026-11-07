# Rencana Desain v0.2.6.1 — Bersih-bersih menu duplikat (sisa)

Sisa dari bersih-bersih menu duplikat yang dilaporkan Agung 6 Nov 2026
("banyak menu duplikat, cukup risih"). Di v0.2.6 sudah digabung "Pusat
Perhatian" ke "Reminder Center" dan dihapus tombol cepat hero; versi ini
menyelesaikan butir 3–5 dari temuan plus satu prop mati. Bukan redesign
visual: tidak ada warna, token, tipografi, atau layout baru. Subjek:
satu pintu per tujuan — tiap fitur punya satu jalan utama yang jelas,
bukan tiga.

## 1. Audit duplikasi (temuan 6 Nov 2026, v0.2.5.1)

Enam duplikasi yang dikonfirmasi dari kode:

1. Pusat Perhatian vs Reminder Center — dua halaman untuk hal yang
   sama. ✅ Selesai di v0.2.6 (digabung ke Reminder Center).
2. Tiga aksi tambah (Aset Baru / Servis / Reminder) muncul 3× — sidebar,
   tombol hero, menu FAB. ✅ Selesai di v0.2.6 (tombol hero dihapus).
3. Logo brand MicroMate muncul dua kali di desktop — navbar atas +
   atas sidebar, bertumpuk. ⬅️ Versi ini.
4. Pengaturan punya tiga pintu di desktop — item sidebar + ikon gear
   navbar + tombol di popover sinkronisasi. ⬅️ Versi ini (ikon gear
   dihapus; popover dipertahankan karena kontekstual).
5. Panduan & Docs punya dua pintu di desktop — item sidebar + ikon
   buku navbar. ⬅️ Versi ini (ikon buku dihapus).
6. Prop `onQuickAddAsset` di Navbar adalah kode mati (dideklarasikan,
   tidak pernah di-render). ⬅️ Versi ini.

Dua kotak pencarian (navbar global vs halaman Aset) dinilai beda fungsi
dan TIDAK diusulkan dihapus — pencarian global memfilter dan melompat
ke halaman Aset, pencarian halaman memfilter daftar yang sedang
ditampilkan.

## 2. Perubahan

### 2.1 Sidebar: blok brand dihapus (`Sidebar.tsx`)

Blok "MicroMate branding" (logo kotak emerald + wordmark + tagline
"Personal Asset Vault", ~15 baris) dihapus. Sidebar kini dimulai
langsung tombol "Tambah Aset Baru", lalu grup "Navigasi utama".
Import `Box` dari lucide-react ikut dihapus karena tidak lagi dipakai
di file ini.

Yang sengaja TIDAK berubah: `sticky top-16`, `h-[calc(100vh-4rem)]`,
`overflow-y-auto`, tinggi header h-16 (offset sidebar bergantung
padanya), tombol "Tambah Aset Baru", grup navigasi, kartu footer
"Offline-First Storage".

### 2.2 Navbar: ikon gear Pengaturan dihapus (`Navbar.tsx`)

Tombol gear desktop (`hidden lg:flex`, `onClick={onOpenSettings}`,
judul "Pengaturan Control Center") dihapus. Prop `onOpenSettings`
TETAP dipertahankan — masih dipakai tombol kontekstual di dalam popover
sinkronisasi ("Kelola Integrasi Storage", saat status belum
terkonfigurasi / sebagian / error). Import ikon `Settings` ikut
dihapus karena tidak lagi dipakai di file ini.

Pintu Pengaturan yang tersisa: item sidebar "Pengaturan", BottomNav
"Pengaturan" (HP), tombol popover sinkronisasi (kontekstual). Komentar
"Action Controls: Contextual Sync Status + Settings" diperbarui
menjadi "Contextual Sync Status" saja supaya tidak basi.

### 2.3 Navbar: ikon buku Panduan & Docs dihapus (`Navbar.tsx`)

Tombol buku (`onNavigateDocs`, ikon `BookOpen`, judul "Panduan &
Dokumentasi") dihapus. Prop `onNavigateDocs` dihapus dari interface
dan destructure Navbar, import `BookOpen` ikut dihapus, dan
pass-through di App.tsx (`onNavigateDocs={() => setActiveTab('docs')
...}`) dihapus. Panduan & Docs tetap bisa dibuka dari item sidebar;
navigasi ke tab `'docs'` tidak berubah.

### 2.4 Navbar: prop mati `onQuickAddAsset` dihapus

Prop `onQuickAddAsset` dihapus dari interface dan destructure Navbar
serta pass-through-nya di App.tsx. Prop ini tidak pernah di-render di
Navbar — murni kode mati.

Yang sengaja TIDAK disentuh: prop `onQuickAddAsset` di AssetList,
DocumentationPage, Dashboard, dan BottomNav — semuanya masih dipakai
(tombol tambah aset di halaman-halaman itu dan menu "+" / Aksi Cepat
di HP). Menghapusnya akan merusak aksi tambah yang hidup.

## 3. Yang tidak berubah

- Model data, sync engine, PIN, demo seeding, navigasi (tetap 7 item),
  BottomNav, halaman Pengaturan, landing, dashboard.
- Tidak ada font eksternal, gradient, atau permukaan baru. Hanya
  penghapusan — tidak ada satu pun gaya visual baru.
- Tidak ada test baru: penghapusan ini tidak mengubah logika (tidak
  ada cabang kondisi baru); test yang ada (sync-queue 11/11,
  demo-seed 4/4) tetap berjalan sebagai regresi.

## 4. Verifikasi

- Lint (`tsc --noEmit`) lolos — tidak ada import/prop tak terpakai.
- Test sync-queue 11/11, demo-seed 4/4.
- Build lolos; preview `/`, manifest, `sw.js` 200.
- Grep di `src/`: tidak ada lagi `onQuickAddAsset` di Navbar.tsx,
  tidak ada blok brand di Sidebar.tsx, tidak ada `BookOpen` / tombol
  gear di Navbar.tsx; tombol popover sinkronisasi (`onOpenSettings`
  di dalam popover) masih ada; `onQuickAddAsset` masih ada di
  AssetList, DocumentationPage, Dashboard, BottomNav (sengaja).

## 5. Risiko

- Rendah. Semua perubahan adalah penghapusan kode yang tidak dipakai
  atau pintu duplikat yang punya pengganti yang jelas. Satu-satunya
  perilaku yang hilang: dua ikon di navbar desktop — keduanya punya
  pintu lain yang sama mudah dijangkau (sidebar). Bila Agung merindukan
  ikon gear/buku di navbar, mengembalikannya adalah satu blok per ikon
  dari riwayat git.
