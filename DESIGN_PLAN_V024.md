# Rencana desain v0.2.4 — Tahap 1 fondasi

Subjek, audiens, dan tugas layar (sama seperti v0.2): aset milik sendiri dan
perawatannya; audiens adalah pemilik yang mengecek apa yang butuh perhatian;
tugas dashboard adalah menjawab apa yang butuh perhatian berikutnya, lalu
bertindak dalam satu klik. Tahap ini fondasi saja: tidak ada perubahan
struktur layout (sidebar adalah tahap 2, v0.2.5), tidak ada perubahan model
data, sync, PIN, atau fitur baru.

Basis: origin/main 895baed (v0.2.3, sudah di-push). Clone lokal di-reset
ke origin/main sebelum membangun, karena working tree sebelumnya berbeda
(9 file terhapus dari index, semua cocok isinya dengan origin).

## Token

Warna tetap: emerald-900 #064e3b (brand ground + tema PWA), stone untuk
permukaan dan teks, amber untuk mendekati jatuh tempo, rose untuk terlambat /
kedaluwarsa. Tidak ada hue aksen baru, tidak ada webfont eksternal (PWA
harus tetap jalan offline), tidak ada gradient hero atau glow dekoratif.

Yang ditambah di `src/index.css` (`@theme` Tailwind v4):

- `--breakpoint-xs: 30rem` (480px). Alasan: class `xs:` dipakai di
  Dashboard.tsx (5 kali: header strip perhatian, subjudul, tombol,
  kartu item, baris aksi) dan AssetDetail.tsx (1 kali: lebar select
  status `max-w-[110px] xs:max-w-[140px] sm:max-w-none`). 480px duduk
  di antara base dan `sm` (640px): di bawah 480px strip perhatian
  menumpuk vertikal, 480–640px mulai berbaris. Tidak ada perubahan kode
  di komponen untuk perbaikan ini — class yang sudah ada akhirnya
  menghasilkan CSS.
- Skala tipe (system sans, nama peran bukan ukuran mentah):
  display 24px/32px, section 18px/28px, subheading 14px/20px,
  body 14px/22px (leading lebih longgar untuk paragraf), label 12px/16px.
  Dipakai di Dashboard; AssetDetail hanya mengikuti untuk judul empty
  state. Layar lain tidak disentuh.

## Radius dan permukaan

Satu sistem radius: hero 24px (banner, satu elemen), kartu/section 16px,
baris/item 12px, pill/tombol penuh. Permukaan tetap flat: border 1px
stone, shadow maksimal 2xs. Yang berubah konkret: kartu KPI dan section
perhatian dari rounded-3xl menjadi rounded-2xl (24px hanya untuk banner).

## Strip perhatian (elemen khas)

- Judul "Needs Attention" menjadi "Perlu Perhatian" (Bahasa Indonesia
  polos, sentence case).
- Item dikelompokkan: "Terlambat (n)" dulu, lalu "Mendatang (n)", masing
  dengan kepala grup kecil (titik warna + jumlah). Urutan di dalam grup
  dipertahankan. Aksi satu klik tetap: "Detail Aset" dan "Selesaikan".
- Chip status sentence case tanpa emoji dan tanpa class uppercase:
  "Terlambat" / "Mendatang" (warna rose/amber sudah membawa artinya).
  Teks relatif sentence case: "Terlambat 3 hari", "Hari ini",
  "3 hari lagi" (sebelumnya all-caps "TERLAMBAT 3 HARI" / "HARI INI!").
- Empty state mendapat aksi: tombol "Tambah Reminder". Data tetap jujur:
  nol tampil sebagai nol, tidak ada nilai palsu.

## Empty state

Pola yang sama di semua tempat: bingkai dashed, ikon, judul sentence
case, penjelasan singkat, satu aksi. Yang diperbaiki:

- Dashboard perhatian: tambah aksi "Tambah Reminder" (sebelumnya tanpa aksi).
- Dashboard perawatan: dari teks polos menjadi bingkai + aksi "Catat Servis".
- Dashboard daftar aset: sebelumnya tidak ada empty state sama sekali
  (ruang kosong saat 0 aset) — tambah bingkai + aksi "Tambah Aset".
- AssetDetail riwayat/dokumen/servis: polanya sudah benar (bingkai +
  aksi, kecuali riwayat yang otomatis dan memang tanpa aksi); hanya judul
  Title Case diubah ke sentence case ("Belum ada dokumen", dst).

## Penulisan antarmuka

Bahasa Indonesia polos, sentence case. Label KPI Inggris diubah:
"Devices" → "Perangkat", "Vehicles" → "Kendaraan", "Home" → "Rumah",
"Laptop, Phone, Tablet" → "Laptop, HP, Tablet". Yang sudah Indonesia
tidak diubah.

## Review terhadap brief (sebelum membangun)

- Bukan default generik: tidak ada gradient, tidak ada all-caps, tidak ada
  ikon KPI di kotak tinted, tidak ada hue baru, tidak ada hero di layar kerja.
- Boldness dipakai di satu tempat: strip perhatian (pengelompokan +
  kepala grup). Sisanya tenang dan disiplin.
- Tidak ada yang menyembunyikan state data: empty state menjaga bingkai,
  sync/error tidak disentuh, angka nol tetap nol.

## Verifikasi

`npm run lint` (tsc --noEmit), `npm run test:sync-queue` (11/11),
`npm run build` (catat precache + ukuran bundle), preview production
dan pastikan `/` 200. Cek visual disarankan lewat iframe wrapper
390/768/1440 (sudah terbukti jalan untuk landing); layar dalam aplikasi
di lebar kecil tetap butuh cek perangkat nyata.
