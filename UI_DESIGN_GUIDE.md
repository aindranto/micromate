# Panduan Desain Antarmuka (UI_DESIGN_GUIDE.md) - MicroMate Hardened Edition

## 1. Sistem Desain & Token Visual (Design Tokens)

### 1.1 Palet Warna Sophisticated (Neutral Cool Slate Theme)
Aplikasi didominasi oleh palet warna neutral-cool untuk menghasilkan kesan profesional, bersih, dan mengutamakan keterbacaan data numerik/faktual:

| Elemen UI | Nilai Kelas Tailwind | Representasi Heksadesimal | Keterangan |
| :--- | :--- | :--- | :--- |
| **Latar Utama** | `bg-slate-50` / `dark:bg-slate-950` | `#F8FAFC` / `#020617` | Latar belakang bersih dengan saturasi rendah |
| **Kontainer Dasar** | `bg-white` / `dark:bg-slate-900` | `#FFFFFF` / `#0F172A` | Kartu utama (Kecerahan kontras maks 7% dari latar) |
| **Teks Utama** | `text-slate-900` / `dark:text-slate-50` | `#0F172A` / `#F8FAFC` | Kontras teks AA WCAG 4.5:1 |
| **Teks Sekunder** | `text-slate-500` / `dark:text-slate-400` | `#64748B` / `#94A3B8` | Label, tanggal, keterangan non-kritis |
| **Aksen Utama** | `text-emerald-600` / `bg-emerald-600` | `#059669` | Menandakan status aktif, sukses, terverifikasi |
| **Aksen Peringatan**| `text-amber-500` / `bg-amber-500` | `#F59E0B` | Menandakan jadwal servis mendekati limit, STNK jatuh tempo |
| **Aksen Bahaya** | `text-rose-600` / `bg-rose-600` | `#E11D48` | Menandakan pengingat overdue, garansi habis, tombol hapus |

### 1.2 Tipografi & Skala Matematis (Typography Scale)
Menggunakan keluarga huruf sans-serif modern teruji (seperti *Plus Jakarta Sans* atau *Inter*) dengan skala pertumbuhan **Major Second (1.125)** untuk fleksibilitas densitas antarmuka aplikasi seluler:

*   **Display / Title**: `text-2xl` (24px, font-bold, tracking-tight)
*   **Section Heading**: `text-lg` (18px, font-semibold)
*   **Sub-heading**: `text-base` (16px, font-medium)
*   **Body Text**: `text-sm` (14px, line-height 1.6, text-slate-700)
*   **Small Label**: `text-xs` (12px, font-semibold, tracking-wider, uppercase)

---

## 2. Aturan Layout, Grid, & Spasi Ritmik

### 2.1 Padding Matematika (Padding Ratio Math)
Untuk menjamin ritme visual yang seimbang, rasio spasi luar kontainer harus selalu bernilai lebih besar atau sama dengan spasi antar elemen di dalamnya:
*   **Container Padding (Outer)**: Wajib menggunakan minimal `p-4` (16px) hingga `p-6` (24px) pada perangkat desktop.
*   **Inner Elements Gap**: Menggunakan `space-y-3` (12px) atau `space-y-4` (16px).
*   **Button Padding**: Rasio horizontal wajib tepat 2x rasio vertikal. Contoh: `py-2 px-4` atau `py-3 px-6`.

### 2.2 Aturan Radius Melingkar Bersarang (Nested Border Radius Rule)
Saat meletakkan elemen rounded di dalam kontainer rounded lainnya, nilai radius sudut dalam wajib disesuaikan dengan formula matematika berikut untuk mencegah bentrokan optik:
$$\text{Radius Corner Dalam} = \text{Radius Corner Luar} - \text{Jarak Padding Antara Keduanya}$$
*   *Contoh*: Jika radius kartu luar adalah `rounded-2xl` (16px) dan memiliki padding sebesar `p-4` (16px), maka elemen kartu di dalamnya wajib menggunakan sudut siku `rounded-none` (0px) atau radius sangat kecil `rounded-sm`.

---

## 3. Komponen Antarmuka Khusus (Custom Enterprise Components)

### 3.1 Navigasi Seluler 4 Tab + Tombol Quick Action Melayang
Untuk menunjang kenyamanan jempol pengguna seluler, navigasi diposisikan di bagian bawah layar:

```text
+-----------------------------------------------------------+
| [Home Icon]   [Asset Icon]     (+)     [Servis]   [Reminder] |
|   Beranda         Aset        Quick     Servis     Pengingat  |
+-----------------------------------------------------------+
```
*   **Tombol Quick Action (`+`)**: Berupa lingkaran melayang hijau emerald (`bg-emerald-600`) berdiameter 56px (target sentuh aman), diposisikan tepat di tengah navigasi bawah. Saat ditekan, tombol ini akan memunculkan menu pop-up transisi lembut untuk menambahkan:
    *   `Catat Aset Baru`
    *   `Catat Servis Baru`
    *   `Tambah Pengingat Baru`

### 3.2 Tab Layout Pengelola Kartu SIM (SIM Card Manager View)
Bila kategori aset dipilih sebagai 'SIM Card', panel detail akan beralih menampilkan komponen tab kartu SIM yang elegan:
*   **Kartu Visual SIM**: Ilustrasi kartu chip SIM berwarna slate gelap dengan penulisan nomor telepon besar (`tracking-widest`) dan nama provider berlogo bersih.
*   **Status Masa Aktif**: Progress bar visual yang berkurang mendekati masa kedaluwarsa kartu dengan penanda warna kuning jika kurang dari 7 hari.
*   **Pelacak Ketergantungan Akun (Account Dependencies)**: Grid berisi kartu-kartu aplikasi kecil (WhatsApp, Tokopedia, Bank, dll.) dengan status saklar (*toggle*) aktif/non-aktif untuk melihat layanan mana saja yang akan terganggu jika kartu SIM ini hangus atau hilang.

### 3.3 Dashboard Utama (Needs Attention & Metrics Dashboard)
*   **Bento Grid Metrics**: Layout metrik pintar (Total Nilai Aset, Pengingat Aktif, Biaya Servis Bulan Ini) yang tersusun rapi tanpa penumpukan shadow berat.
*   **Needs Attention Carousel**: Daftar aset yang membutuhkan tindakan mendesak (STNK akan jatuh tempo, masa berlaku garansi habis besok, kilometer servis terlampaui) dengan pewarnaan aksen kuning amber dan rose merah yang kontras di atas latar putih bersih.
