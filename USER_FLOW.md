# Alur Perjalanan Pengguna (USER_FLOW.md) - MicroMate Hardened Edition

## 1. Alur Pengenalan Awal (First-Run Onboarding Flow)

```text
               +----------------------------------+
               |      MEMBUKA MICROMATE           |
               +----------------+-----------------+
                                |
                                ▼
               +----------------+-----------------+
               |     PILIHAN PENYIMPANAN          |
               +-------+------------------+-------+
                       |                  |
           [Local Mode Only]     [Google Cloud Hybrid]
                       |                  |
                       ▼                  ▼
               +-------+--------+ +-------+--------+
               | Masuk Langsung | | Panduan Salin  |
               | Ke Dashboard   | | Kode Script &  |
               +----------------+ | Deploy Web App |
                                  +-------+--------+
                                          |
                                          ▼
                                  +-------+--------+
                                  | Tempel URL Web |
                                  | App Apps Script|
                                  +-------+--------+
                                          |
                                          ▼
                                  +-------+--------+
                                  | Kirim OTP Ke   |
                                  | Email Pemilik  |
                                  +-------+--------+
                                          |
                                          ▼
                                  +-------+--------+
                                  | Masukkan Kode  |
                                  | OTP 6-Digit    |
                                  +-------+--------+
                                          |
                                          ▼
                                  +-------+--------+
                                  |   Verifikasi   |
                                  | OTP Berhasil   |
                                  +-------+--------+
                                          |
                                          ▼
                                  +-------+--------+
                                  | Pembuatan Sesi |
                                  |  (session_id)  |
                                  +-------+--------+
                                          |
                                          ▼
                                  +-------+--------+
                                  | Resolusi Data  |
                                  |    Awal        |
                                  +--+---+---+-----+
                                     |   |   |
                  [Existing Cloud]---+   |   +---[Demo Data]
                                         ▼
                                   [Empty/Baru]
                                         |
                                         ▼
                                  +------+---------+
                                  | Masuk Aplikasi |
                                  |     Utama      |
                                  +----------------+
```

### 1.1 Langkah-Langkah Detil Onboarding
1.  **Pemilihan Mode Penyimpanan**: Pengguna disambut dengan layar onboarding terpisah `/setup`. Pengguna memilih antara **Penyimpanan Lokal Saja (Offline)** atau **Hibrida Cloud (Google Personal Storage)**.
2.  **Penyimpanan Cloud Personal**:
    *   Sistem menyajikan panduan interaktif lengkap dengan salinan kode Apps Script teroptimasi yang sudah mendukung otorisasi Google Drive, Google Sheets, dan MailApp.
    *   Pengguna menyalin kode, menempelkannya pada lembar kerja Google Apps Script baru, melakukan otorisasi pemicu `testAuthAndEmail`, serta men-deploy-nya sebagai Web App yang dapat diakses oleh siapa saja (*Anyone*).
    *   Pengguna menyalin URL Web App tersebut dan menempelkannya di bidang input onboarding MicroMate.
3.  **Identifikasi & Pengiriman OTP**:
    *   Sistem mengirimkan request `identify` menggunakan server-side proxy relay `/api/exec`.
    *   Apps Script mengonfirmasi kecocokan identitas email, menyamarkan alamat email tersebut (*masked email*), lalu mengirimkan kode OTP 6-digit terenkripsi ke kotak masuk email pemilik.
    *   Layar onboarding berubah secara dinamis menampilkan bidang isian verifikasi OTP dengan indikator pengiriman ke alamat email yang disamarkan.
4.  **Verifikasi Sesi & Resolusi Data**:
    *   Pengguna memasukkan kode OTP 6-digit. Sistem memproses verifikasi sesi melalui pintu gerbang proxy `/api/exec`.
    *   Apps Script memvalidasi OTP, mencatat `session_id` baru dengan masa kedaluwarsa 30 hari di dalam sheet `Sessions`, lalu mengembalikan status sukses bersama ID sesi tersebut ke klien.
    *   Klien menyimpan `session_id` tersebut di dalam `localStorage`.
    *   Pengguna disajikan pilihan inisialisasi data:
        *   **Gunakan Data Cloud Saja**: Menarik seluruh data riwayat aset dari Google Sheets yang terhubung (`pull`).
        *   **Mulai Baru/Kosong**: Membersihkan data lokal tanpa memodifikasi awan.
        *   **Gunakan Data Demo**: Memuat data demo secara instan ke IndexedDB lokal dan mengantrekan proses unggahan masif ke Google Sheets.

---

## 2. Alur Transaksi Utama Aplikasi (Core App Interactions)

### 2.1 Menambah & Mengedit Siklus Hidup Aset (Kategori Kendaraan / Perangkat)
1.  Pengguna menekan tombol Quick Action melayang **`+`** atau mengeklik tombol "Tambah Aset" pada tab Aset.
2.  Pengguna memasukkan data dasar aset (Nama, Kategori, Merek, Lokasi, Penanggung Jawab, Foto, dll.).
3.  Jika pengguna memilih kategori **Vehicle**: Tab isian detail kendaraan akan aktif secara dinamis (Pelat Nomor, Kilometer Saat Ini, Tanggal STNK Tahunan, Pajak 5 Tahunan, dll.).
4.  Jika pengguna memilih kategori **Device**: Tab IMEI, Nomor Model, dan Aksesoris akan muncul.
5.  Jika pengguna memilih kategori **SIM Card**: Form isian data kartu SIM akan aktif (Nomor, Provider, Tanggal Kedaluwarsa Kartu, serta check-box Ketergantungan Akun seperti WhatsApp, M-Banking, dll.).
6.  Setiap modifikasi bidang sensitif siklus hidup (`status`, `assigned_user`, `location`) akan otomatis menghasilkan entri `AssetHistoryEvent` bertanggal saat itu juga.
7.  Sistem menyimpan data secara instan ke IndexedDB lokal, merekonstruksi nilai kalkulasi TCO pada UI layar, lalu mendaftarkan aksi `saveAsset` serta aksi unggahan berkas `uploadFile` (jika ada lampiran foto baru) ke dalam antrean sinkronisasi lokal.

### 2.2 Pencatatan Log Servis (Maintenance)
1.  Dari halaman detail aset atau menu Quick Action, pengguna mengeklik **Catat Servis**.
2.  Pengguna memasukkan jenis servis, tanggal, kilometer saat servis, biaya, dan catatan perbaikan.
3.  Sistem menyimpan log servis ke IndexedDB lokal secara transaksional, memperbarui log siklus hidup aset, menghitung ulang akumulasi TCO, mengantrekan aksi `syncMaintenance` ke antrean sinkronisasi, serta memicu pengurasan antrean sinkronisasi secara background.

---

## 3. Alur Penanganan Sinkronisasi & Konflik (Sync & Conflict Handling)

### 3.1 Siklus Pengurasan Antrean Sinkronisasi (Sync Queue Flush)
```text
                  Trigger Sync (Online/Manual/Save)
                                 │
                                 ▼
                     Apakah is_syncing === true?
                       ├──[Ya]──▶ Tolak / Abaikan (Mutex Lock)
                       └──[Tidak]
                                 │
                                 ▼
                         is_syncing = true
                                 │
                         Buka Transaksi DB
                                 │
                                 ▼
                       Ambil Semua Queue Items
                                 │
                     Proses Serial Satu per Satu
                     (Aksi: saveAsset, uploadFile,
                      syncMaintenance, deleteAsset, dll.)
                                 │
                     Menggunakan Sesi Verifikasi
                     Header: X-Apps-Script-Url, session_id
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
              [Sukses Respon]         [Gagal Koneksi]
                     │                       │
           Hapus Item dari Queue    Retain di Queue &
                     │              Atur Retry Backoff
                     ▼                       ▼
            Proses Item Berikutnya    Hentikan Flush
                     │                       │
                     └───────────┬───────────┘
                                 │
                                 ▼
                         is_syncing = false
                                 │
                                 ▼
                    Picu Pembaruan Status UI
```

### 3.2 Resolusi Konflik Bersaing (Distributed Conflict Resolution)
*   **Kasus Edit Bersamaan (LWW - Last-Write-Wins Berbasis Klien)**:
    1.  Dua browser (Browser A offline, Browser B online) menyunting aset yang sama.
    2.  Browser B melakukan sinkronisasi terlebih dahulu. Data tersimpan di Google Sheets dengan status waktu sunting (`updated_at` bernilai `10:05`).
    3.  Browser A yang offline memiliki suntingan bertanggal `10:10`.
    4.  Saat Browser A kembali online dan mengirimkan antrean `saveAsset` dengan metadata `updated_at: 10:10`, Apps Script akan membandingkan timestamp ini dengan data Sheets.
    5.  Karena `10:10 > 10:05`, Apps Script menerima dan menimpa baris Sheets tersebut. Jika sebaliknya, request dibuang demi menjaga integritas data terbaru.
*   **Kasus Hapus vs Edit (Tombstone Wins)**:
    1.  Browser A menghapus aset. ID aset terdaftar dalam sheet `DeletedAssets`.
    2.  Browser B yang belum tahu melakukan pengeditan aset tersebut secara lokal.
    3.  Saat Browser B melakukan sinkronisasi, Apps Script mendeteksi bahwa ID aset tersebut tercatat dalam sheet `DeletedAssets`.
    4.  Apps Script secara deterministik menolak suntingan Browser B dan memerintahkan Browser B untuk menghapus salinan aset lokalnya saat siklus pull berikutnya.
