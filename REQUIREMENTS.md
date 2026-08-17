# System & Functional Requirements (REQUIREMENTS.md) - MicroMate Hardened Edition

## 1. Persyaratan Fungsional (Functional Requirements)

### 1.1 Modul Kemitraan & Autentikasi Gateway (Session Gateway Pairing)
*   **REQ-1.1.1 (Pemberantasan Token Statis)**: Sistem DILARANG KERAS menggunakan `micromate_access_token` statis sebagai basis keamanan utama. Token akses statis wajib dihapus dari seluruh alur kerja.
*   **REQ-1.1.2 (Sesi Berbasis OTP)**: Ketika pengguna memasukkan Apps Script URL dan memicu identifikasi, sistem harus mengirimkan OTP 6-digit acak berbasis kriptografi ke email pemilik spreadsheet.
*   **REQ-1.1.3 (Verifikasi Sesi)**: Jika OTP yang dimasukkan pengguna cocok, Google Apps Script wajib menerbitkan `session_id` acak dengan timestamp kedaluwarsa (`expires_at`) 30 hari ke depan, dan mencatatnya ke dalam sheet `Sessions`.
*   **REQ-1.1.4 (Penyimpanan Kredensial)**: Browser hanya boleh menyimpan `session_id` yang valid dalam `localStorage`.
*   **REQ-1.1.5 (Pemeriksaan Otorisasi Transaksi)**: Setiap aksi mutasi (`syncAsset`, `uploadFile`, `syncMaintenance`, `syncReminder`, `deleteAsset`, dll.) wajib menyertakan `session_id`. Apps Script wajib memvalidasi sesi tersebut terhadap sheet `Sessions`. Jika sesi tidak ditemukan atau kedaluwarsa, Apps Script harus mengembalikan respon kesalahan status `success: false` dengan error `UNAUTHORIZED_SESSION`.
*   **REQ-1.1.6 (Revokasi Sesi saat Disconnect)**: Saat pengguna mengeklik "Disconnect" di halaman pengaturan, sistem wajib mengirimkan request `revokeSession` ke Apps Script untuk menghapus baris sesi terkait dari sheet `Sessions` dan menghapus seluruh flag otentikasi lokal di browser.

### 1.2 Modul Pengelola Sinkronisasi (Robust Sync Engine)
*   **REQ-1.2.1 (Pencegahan Balapan Sinkronisasi / Mutex Lock)**: Sistem wajib memiliki status boolean `is_syncing` dalam state manajer dan IndexedDB. Ketika fungsi `flushSyncQueue()` aktif, status `is_syncing` diatur menjadi `true` untuk menolak pemicuan fungsi flush paralel lainnya dari event background mana pun hingga proses selesai seluruhnya.
*   **REQ-1.2.2 (Sifat Idempotensi Append)**: Aksi pengiriman data servis berkala dan pengingat DILARANG menggunakan fungsi `appendRow()` buta. Aksi tersebut wajib mendeteksi keberadaan ID yang sama (`maintenance_id` atau `reminder_id`) di dalam baris Google Sheets untuk memutuskan apakah akan melakukan pembaruan baris (*update*) atau penambahan baris baru (*insert*).
*   **REQ-1.2.3 (Tombstone Terpusat)**: Setiap kali aset dihapus dari antarmuka lokal, sistem harus mencatat ID aset tersebut ke dalam antrean penghapusan (`deleteAsset`) dan menulis ID tersebut ke dalam sheet `DeletedAssets` di Google Sheets saat sinkronisasi dibilas.
*   **REQ-1.2.4 (Penolakan Update Terhapus)**: Selama proses pull data dari Sheets (`pullFromGoogleSheets`), sistem wajib menyaring data aset menggunakan isi tabel `DeletedAssets` untuk memastikan aset yang telah terhapus di satu perangkat tidak akan muncul kembali di perangkat lainnya.

### 1.3 Modul Manajemen Siklus Hidup Aset & SIM Card
*   **REQ-1.3.1 (Pelacakan Riwayat Mutasi)**: Setiap kali pengguna mengubah nilai `assigned_user`, `status`, atau `location` pada suatu aset, sistem wajib menghasilkan catatan `AssetHistoryEvent` baru secara otomatis dan menyimpannya ke dalam array `history` pada objek aset lokal.
*   **REQ-1.3.2 (Sinkronisasi Riwayat)**: Riwayat aset wajib dikirim ke awan dan disimpan dalam sheet khusus `AssetHistory` di Google Sheets guna mendukung visualisasi timeline siklus hidup yang utuh pada seluruh perangkat klien.
*   **REQ-1.3.3 (Manajer Kartu SIM)**: Pengguna dapat memilih kategori aset 'SIM Card'. Form edit/tambah aset harus menampilkan tab input spesifik kartu SIM jika kategori tersebut dipilih, yang meliputi:
    *   Nomor Telepon
    *   Provider (Telkomsel, Indosat, XL, Tri, Smartfren, dll.)
    *   Masa Aktif & Masa Tenggang Kartu
    *   Ketergantungan Akun (Daftar aplikasi eksternal yang terikat pada nomor tersebut: WhatsApp, Tokopedia, Shopee, M-Banking, Email, dll.)
*   **REQ-1.3.4 (Pelacak Ketergantungan Akun / Dependency Tracker)**: Pengguna dapat mengelola daftar aplikasi eksternal yang terkait langsung dengan SIM Card tersebut dengan indikator visual status aktif/non-aktif dari integrasi platform tersebut.

### 1.4 Modul Keuangan & TCO (Total Cost of Ownership)
*   **REQ-1.4.1 (Skema Pengeluaran / Expenses)**: Aksi penambahan servis berkala atau biaya pembelian aset wajib dicatat dalam array `expenses` yang terstruktur di dalam objek aset lokal dan disinkronkan ke dalam sheet `Expenses` di Google Sheets.
*   **REQ-1.4.2 (Rekonstruksi TCO)**: Saat data ditarik dari cloud (`pull`), nilai TCO harus dihitung ulang dengan menjumlahkan harga pembelian aset ditambah total seluruh pengeluaran servis dan pengeluaran tambahan yang berhasil diambil dari tabel `Expenses` awan, guna menjamin integritas visual TCO di seluruh layar browser.

### 1.5 Modul Pengingat Berulang (Recurring Reminders)
*   **REQ-1.5.1 (Logika Pengulangan)**: Ketika sebuah pengingat yang memiliki tipe pengulangan non-'none' (Monthly, Quarterly, Semi-Annually, Annually) diubah statusnya menjadi `completed`, sistem wajib:
    *   Memperbarui status pengingat lama tersebut di server lokal dan cloud menjadi `completed`.
    *   Menghitung tanggal jatuh tempo berikutnya (`due_date`) berdasarkan interval pengulangan dari tanggal jatuh tempo saat ini.
    *   Membuat satu entri instansi pengingat baru yang berstatus `upcoming` dengan tipe pengulangan yang sama.
*   **REQ-1.5.2 (Idempotensi Garansi Aset)**: Entri pengingat garansi aset wajib diberi ID unik berbasis `war_rem_<asset_id>` dan disinkronkan menggunakan metode upsert, guna mengeliminasi bug pelipatgandaan pengingat garansi setiap kali aset diedit.

---

## 2. Persyaratan Non-Fungsional (Non-Functional Requirements)

### 2.1 Keamanan & Privasi (Security & Privacy)
*   **NFR-2.1.1 (Perlindungan Berkas Private di Google Drive)**: Enkripsi ringan atau pembatasan akses berbagi berkas wajib dilakukan. Pengaturan visibilitas unggahan berkas gambar dan dokumen harus menggunakan akses terikat API melalui session gateway, bukan lagi murni dipublikasikan dengan tautan terbuka (`ANYONE_WITH_LINK`) jika platform mendukung rendering blob binary via base64 relay.
*   **NFR-2.1.2 (Pencegahan Kebocoran Email)**: Email pemilik spreadsheet yang dikembalikan ke browser oleh fungsi identifikasi wajib disamarkan (*masked*, contoh: `ai*****2@gmail.com`) untuk melindungi privasi akun pengguna.
*   **NFR-2.1.3 (Penggunaan Kriptografi OTP)**: Kode OTP wajib dibuat menggunakan generator nilai acak yang aman secara kriptografis (*Cryptographically Secure Pseudo-Random Number Generator*) pada lingkup Apps Script.

### 2.2 Kinerja & Batas Sumber Daya (Performance & Scalability)
*   **NFR-2.2.1 (Batas Ukuran Unggah Berkas)**: Pintu gerbang server-side proxy API Express `/api/exec` wajib dikonfigurasi untuk menerima payload JSON hingga ukuran **50 MB** guna memfasilitasi kelancaran transfer berkas dokumen biner besar tanpa hambatan kesalahan status *HTTP 413 Payload Too Large*.
*   **NFR-2.2.2 (Kompresi Citra Cerdas)**: Berkas foto berukuran di atas 5 MB yang diambil dari kamera atau file manager wajib melewati proses kompresi cerdas pada level klien sebelum ditransmisikan, guna menghemat lebar pita jaringan (*bandwidth*) dan mencegah batas kuota eksekusi Apps Script (Google Quota Timeout 30 detik).

### 2.3 Desain Antarmuka & Portabilitas (UI & Portability)
*   **NFR-2.3.1 (Desain Mobile-Responsive)**: Antarmuka aplikasi harus dirancang khusus untuk layar sentuh seluler (touch targets minimum 44px) dengan sistem navigasi 4 tab bawah ditambah 1 tombol Quick Action melayang.
*   **NFR-2.3.2 (Offline Autonomy)**: Aplikasi harus tetap dapat digunakan secara instan di dalam browser meskipun koneksi jaringan internet padam sepenuhnya, menyimpan seluruh transaksi dalam IndexedDB, dan otomatis melakukan siklus sinkronisasi mandiri saat jaringan kembali terdeteksi online.
*   **NFR-2.3.3 (Bebas Komparasi Sintaksis & Type Safety)**: Seluruh file kode sumber TSX wajib lolos dari proses pengecekan transpilisasi TypeScript (`tsc --noEmit`) tanpa kesalahan apa pun.
