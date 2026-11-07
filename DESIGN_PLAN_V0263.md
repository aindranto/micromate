# Rencana Desain v0.2.6.3 — Perbaiki temuan audit anti-slop fase 2

Fase 2 dari perbaikan bertahap atas audit anti-slop (mode After) 7 Nov
2026 terhadap Micromate v0.2.6.1. Fase ini hanya temuan 4–6; temuan 1–3
sudah diperbaiki di v0.2.6.2, temuan 7–9 dikerjakan di fase 3, bukan di
versi ini. Bukan redesign visual: tidak ada warna baru, token baru,
tipografi baru, layout baru, atau perilaku baru. Subjek: klaim yang
tidak bisa diverifikasi, gradasi tanpa alasan, dan emoji sebagai ikon.

## 1. Temuan 4 — Klaim kompetitor (R-36)

Aturan anti-slop: jangan membuat klaim tentang produk yang tidak
disebut namanya dan tidak bisa diverifikasi. Kartu kanan
("Aplikasi Sejenis Konvensional") di bagian perbandingan landing
ditulis ulang; kartu kiri ("MicroMate Vault"), judul bagian, dan
kalimat penutup tidak berubah.

| Baris | Lama | Baru |
| --- | --- | --- |
| Tersimpan di Server Luar | "Data dan foto dokumen penting disimpan di server perusahaan lain yang rentan peretasan atau perubahan kebijakan privasi." | "Data dan foto dokumen penting tersimpan di server perusahaan lain, sehingga keamanan dan aksesnya mengikuti kebijakan perusahaan tersebut." |
| Skema Biaya Berlangganan | "Sering meminta biaya bulanan/tahunan berulang untuk membuka batasan jumlah aset atau fitur lampiran berkas." | "Biaya bulanan/tahunan bisa menjadi syarat untuk membuka batasan jumlah aset atau fitur lampiran berkas." |
| Ketergantungan Internet | "Aplikasi sering kali lambat atau tidak bisa dibuka jika sinyal internet terputus." | "Aplikasi yang bergantung pada server tidak bisa dibuka saat sinyal internet terputus." |
| Format Terkunci (Vendor Lock-in) | "Sulit memindahkan data ke aplikasi lain jika suatu saat Anda ingin berpindah sistem." | Tidak berubah — isinya menjelaskan mekanisme lock-in (format tertutup → data sulit dipindah), bukan fakta tentang suatu produk. |

Prinsip penulisan ulang: klaim perilaku ("sering", "rentan") diganti
fakta arsitektur ("data di server pihak ketiga → keamanan mengikuti
kebijakan pemilik server", "aplikasi bergantung server → tidak bisa
dibuka tanpa internet") atau dilunakkan menjadi kemungkinan
("bisa menjadi syarat").

## 2. Temuan 5 — Gradasi (R-01)

Aturan anti-slop: gradasi yang dipakai tanpa alasan tertulis
diratakan. Alasan di sini, dicatat sesuai aturan: arah desain
Micromate adalah permukaan datar tanpa gradasi — warna solid
emerald/stone yang sama sudah cukup membedakan hierarki (kartu
unggulan tetap dibedakan oleh border emerald-500/50 dan badge
"Rekomendasi Utama", bukan oleh gradasi).

| Lokasi | Lama | Baru |
| --- | --- | --- |
| LandingPage logo "M" | `bg-gradient-to-br from-emerald-500 to-emerald-700` | `bg-emerald-600` |
| LandingPage hero | `bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950` | `bg-stone-950` |
| LandingPage kartu mockup | `bg-gradient-to-b from-emerald-950/60 to-stone-950` | `bg-stone-950` |
| LandingPage panel CTA | `bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-950` | `bg-emerald-950` |
| DocumentationPage header | `bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950` | `bg-emerald-900` |
| DemoOnboardingModal header | `bg-gradient-to-r from-stone-900 via-stone-850 to-stone-950` | `bg-stone-900` |
| OnboardingPage blob dekoratif atas | `bg-gradient-to-b from-emerald-600/15 via-emerald-900/10 to-transparent blur-3xl` | DIHAPUS (bukan diratakan — blok solid 800×400px akan tampak salah; blob ini murni dekorasi, tidak punya fungsi hierarki) |

Setelah perubahan: nol `bg-gradient-to-` di seluruh `src/` (grep).
Yang dibiarkan dan alasannya: blob kedua di OnboardingPage
(`bg-emerald-800/10 blur-3xl`) dan lingkaran blur di header
DocumentationPage (`bg-emerald-500/10 rounded-full blur-3xl`)
warnanya solid, bukan gradasi — R-01 mengatur gradasi, bukan bentuk
blur solid. Headline hero (emerald solid) dan tombol utama (emerald
solid) memang sudah solid dan tidak disentuh.

## 3. Temuan 6 — Ikon (R-04)

Aturan anti-slop: emoji bukan ikon UI; pakai sistem ikon aplikasi
(lucide) atau titik warna CSS. Sapuan menyeluruh: semua emoji
piktografis dan lingkaran warna di `src/` diganti atau dihapus.
Keputusan per lokasi (ikon lucide yang dipakai sudah ada di sistem,
tidak ada dependency baru):

| Lokasi | Lama | Baru |
| --- | --- | --- |
| Badge hero landing | Ikon lucide `Sparkles` | Ikon lucide `Bell` — badge-nya tentang pengingat/perhatian, lonceng lebih relevan daripada sparkle |
| Mockup landing, 3 kartu aset | 💻 🚗 📷 | `Laptop` / `Car` / `Camera` (w-6 h-6 di tile w-12) |
| Mockup landing, "Servis Rutin" | ⚠️ | `AlertTriangle` (w-3 h-3, inline, rose-400) |
| Banner demo (Navbar) | 🧪 | Dihapus — teks "Data contoh (demo assets) aktif." sudah jelas |
| Badge status sync (Navbar popover) | 🟢 ⚪ 🟡 🔄 🔴 | Titik warna CSS (emerald-600 / stone-400 / amber-500 / rose-600) + `RefreshCw` berputar untuk "Syncing" |
| Status layanan (Navbar + Pengaturan) | ⚪ / ⚠️ | Titik warna CSS (stone-400 belum terhubung, amber-500 belum dikonfigurasi/verifikasi) |
| Tombol "Kelola Integrasi Storage" | ☁️ | Dihapus — ikon `UploadCloud` sudah ada di tombol yang sama |
| Pil status pengingat (Reminder Center) | 🔴 🟡 🟢 🔵 | Titik warna CSS (rose-600 / amber-500 / stone-400 / emerald-600, selaras dengan titik di heading grup) |
| Judul "Jatuh Tempo (Overdue)" | ⚠️ | `AlertTriangle` (w-4 h-4, rose-600); titik berdenyut di sebelahnya dihapus supaya tidak dobel penanda |
| Judul "Hari Ini" / "Mendatang" / "Selesai" | 📅 🔵 🟢 | Dihapus — titik warna di sebelah judul sudah menjadi penanda |
| Pengaturan: antrean bersih | ✨ | Dihapus — kalimatnya berdiri sendiri |
| Pengaturan: eror antrean, eror OTP, konfirmasi hapus | ⚠️ | Dihapus — kotaknya sudah rose (eror/peringatan) |
| Pengaturan: pesan info OTP | ℹ️ | Dihapus — kotaknya sudah emerald (info/sukses) |
| Pengaturan: timer OTP | ⏱️ | Dihapus — angka hitung mundur sudah jelas dari konteks |
| Pengaturan: "Buka Panduan & Salin Skrip" | 📖 | Dihapus — ikon `FileCode` sudah ada di tombol yang sama |
| Pengaturan: "Gagal mengimpor file JSON." | ⚠️ | Dihapus — status impor diwarnai lewat `includes('Berhasil')`, jadi pesan gagal tetap tampil sebagai eror |
| Pengaturan: badge "Active & Verified" | 🟢 | Titik warna CSS emerald-600 |
| Panduan & Docs: 2 tab | 📘 ⚙️ | Dihapus — ikon `UserCheck` / `Code2` sudah ada di tombol yang sama |
| Panduan & Docs: 7 judul kartu fitur | 🔍 🖼️ 📱 🔒 ☁️ 🔒 🛡️ | `Search` / `Image` / `Smartphone` / `Lock` / `Cloud` / `Lock` / `ShieldCheck` (w-3.5 h-3.5, inline-flex) |
| Panduan & Docs: diagram arsitektur | 📱 ⚙️ 📂 📊 | `Smartphone` / `Settings` / `Folder` / `Table` (inline-flex, ukuran w-3–3.5) |
| Panduan & Docs: pohon folder | 📁 ×5 | Dihapus — pohon teks (`└──`, `├──`) tetap terbaca tanpa ikon; ikon di dalam pohon monospace akan merusak perataan |
| Panduan & Docs: "🔄 Prinsip ..." | 🔄 | Dihapus — paragrafnya berdiri sendiri |
| DemoOnboardingModal: badge status | 🧪 | `FlaskConical` (w-4 h-4) — badge-nya butuh penanda visual |
| Opsi status aset (AssetDetail, `<option>` native) | 🟢 🟡 ⚪ 🔵 🔴 | Dihapus — elemen `<option>` native tidak bisa menampilkan ikon maupun titik CSS |
| PinLockModal: catatan keamanan | 🔒 | `Lock` (w-3.5 h-3.5, inline) |
| Step1Identity: "Generasi Otomatis" | 🔒 | `Lock` (w-3 h-3, inline) |
| Step2Specs: status registrasi SIM | ✅ ⚠️ ❌ | Dihapus — tombolnya sudah punya state terpilih (border emerald) dan teksnya berbeda |
| OnboardingPage: badge "Direkomendasikan" | ⭐ | `Star` (w-3 h-3, inline) |
| OnboardingPage: judul opsi penyimpanan | ☁️ 💻 | Dihapus — tile ikon `Cloud` / `HardDrive` sudah ada di atas judul |
| OnboardingPage: badge "Setup Google Storage" | ☁️ | Dihapus — teksnya sudah jelas |
| OnboardingPage: eror setup (×2) | ⚠️ | Dihapus — kotaknya sudah rose |
| OnboardingPage: 3 tile opsi data awal | ☁️ 📄 📦 | `Cloud` / `FileText` / `Package` (w-4 h-4 di tile w-8) |
| OnboardingPage: "Setup ± 5 menit" | ⏱️ | Dihapus — teksnya sudah jelas |

Sengaja dibiarkan dan alasannya:

- Tanda ✓ / ✕ (U+2713 / U+2715): dingbat teks, bukan emoji — tampil
  sebagai huruf biasa, bukan gambar berwarna. Beberapa dipakai logika
  pencocokan string (`pinMsg.includes('✓')`,
  `pullMessage.includes('✓')`, pewarna log `startsWith('❌')`), jadi
  mengubahnya berarti mengubah logika — di luar temuan audit.
- Log diagnostik `contractTests.ts` (❌/✓ di awal baris log): penanda
  log yang dipakai renderer Pengaturan untuk mewarnai baris; bukan
  ikon UI.
- Komentar kode yang mengandung emoji/panah (➔, ↘, ✓ di
  `documentDomain.ts`, `transactionLedger.ts`): tidak tampil ke
  pengguna.
- Ikon lucide `Sparkles` di AiAssistantModal, Step1Identity, dan
  SettingsModal: komponen lucide, bukan emoji; temuan audit hanya
  menyebut sparkle di badge hero — tidak diubah.
- Heading "Perlu Perhatian" di dashboard: sudah memakai lucide
  `ShieldAlert`. Kutipan audit "⚠️ 7 Perlu Ditindaklanjuti" tidak ada
  di kode (parafrasa dari pemeriksaan browser) — tidak ada yang
  diperbaiki di sana.
- Simbol ✕ di tabel perbandingan landing: dingbat teks (U+2715),
  bukan emoji.

## 4. Yang TIDAK berubah

Tidak ada perubahan model data, sync engine, PIN, demo seeding,
navigasi, logika pengingat, atau layout. Semua perubahan adalah
teks dan className di permukaan.

## 5. Verifikasi

- Lint `tsc --noEmit`: lolos.
- Tes sync-queue: 11/11. Tes demo-seed: 4/4.
- Build: lolos (angka bundle dicatat di laporan).
- Preview: `/`, manifest, `sw.js` 200.
- Grep: nol `bg-gradient-to-` di `src/`; nol emoji piktografis /
  lingkaran warna di teks yang dilihat pengguna (sisa hanya ✓/✕/❌
  yang dijelaskan di atas dan komentar kode).
