# Product Requirement Document (PRD) - MicroMate Hardened Enterprise Edition

## 1. Visi Produk & Ringkasan Eksekutif
MicroMate adalah aplikasi manajemen siklus hidup aset pribadi (Personal Asset Lifecycle & Maintenance Manager) yang mengutamakan privasi data (*Privacy-First*) dengan memanfaatkan penyimpanan awan milik pengguna sendiri (*Google Sheets* sebagai basis data metadata dan *Google Drive* sebagai penyimpanan dokumen terenkripsi/aman). Aplikasi ini berjalan dalam mode hibrida (*Offline-First*) untuk memastikan fungsionalitas penuh di perangkat seluler maupun desktop tanpa ketergantungan koneksi internet konstan.

Hardened Enterprise Edition dirancang khusus untuk mengatasi seluruh kerentanan sinkronisasi, celah keamanan otentikasi OTP, penyimpangan skema (*schema drift*), dan bug logika siklus hidup aset demi menghasilkan produk rilis yang stabil, andal, dan siap produksi (*Production-Ready*).

---

## 2. Masalah Utama & Solusi Rekayasa

### 2.1 Celah Keamanan OTP & Token Akses
*   **Masalah**: Token akses statis masih tersimpan di browser dan di-bypass jika bernilai kosong. OTP hanya berfungsi sebagai indikator visual dan tidak menghasilkan sesi terenkripsi berbatas waktu pada Apps Script.
*   **Solusi**: Menghapus token akses statis sepenuhnya. Mengimplementasikan sistem **Gateway Session Pairing** berbasis OTP. OTP yang valid akan menghasilkan `session_id` terenkripsi dengan masa kedaluwarsa 30 hari yang disimpan di Google Sheets dan diverifikasi pada setiap transaksi mutasi data.

### 2.2 Balapan Kondisi Sinkronisasi (Sync Race Condition)
*   **Masalah**: Fungsi `flushSyncQueue()` dapat dipicu secara simultan oleh berbagai event (Startup, Online, Visibility Change, Manual Click), mengakibatkan append data duplikat pada log servis, pengingat, dan dokumen.
*   **Solusi**: Mengimplementasikan **Client-Side Sync Mutex Lock** menggunakan flag status transaksi dalam IndexedDB (Dexie.js) guna menjamin eksekusi antrean berjalan serial dan terisolasi.

### 2.3 Konflik Distribusi (Conflict Resolution) & Tombstone
*   **Masalah**: Kebijakan "DELETE > UPDATE" belum deterministik pada skenario multi-perangkat. Update pasca-hapus dari perangkat lain dapat menghidupkan kembali aset yang telah dihapus.
*   **Solusi**: Membuat tabel tombstone khusus bernama `DeletedAssets` di Google Sheets. Setiap proses sinkronisasi akan melakukan filter silang terhadap ID yang masuk untuk menolak mutasi dari aset yang telah terhapus.

### 2.4 Ketidakselarasan Kontrak Skema (Schema Drift & Data Contract)
*   **Masalah**: Struktur data pengiriman log servis (`service_type` vs `record.type`), dokumen (`doc_id` vs `document_id`), dan pengingat tidak sinkron antara kode React dan Apps Script.
*   **Solusi**: Menetapkan spesifikasi kontrak skema kanonikal tunggal yang di-share oleh Client dan Apps Script Gateway, dilengkapi dengan mekanisme pemetaan (*mapping*) tipe data yang ketat.

### 2.5 Fitur Belum Selesai (SIM Card Manager & TCO Cloud Persistence)
*   **Masalah**: Total Cost of Ownership (TCO) dan pengeluaran (*expenses*) hilang setelah ditarik dari cloud karena tidak disimpan di Google Sheets. Riwayat aset lokal juga tidak sinkron ke awan. SIM Card Manager dan Tracker Akun hanya berupa representasi tipe data tanpa fungsionalitas UI.
*   **Solusi**: Menambahkan tabel `Expenses` dan `AssetHistory` di Google Sheets. Membaca dan menulis seluruh riwayat aset serta pengeluaran ke awan. Membangun UI penuh untuk pengelola SIM Card dan pelacak ketergantungan akun.

---

## 3. Profil Pengguna & Target Audiens
1.  **Tech-Savvy Professionals / Home-Lab Enthusiasts**: Individu yang memiliki banyak perangkat elektronik, kendaraan pribadi, dan aset rumah tangga penting, serta sangat peduli dengan kedaulatan data pribadi mereka tanpa biaya langganan bulanan dari SaaS pihak ketiga.
2.  **Sistem Administrator Lokal**: Pengelola aset skala kecil/kantor mikro yang membutuhkan visibilitas siklus hidup perangkat keras, STNK kendaraan kantor, servis berkala, dan penanggung jawab aset aktif secara real-time.

---

## 4. Cakupan Fitur (Functional Scope)

### 4.1 Onboarding & Pairing Gateway
*   **Local Only Mode**: Penggunaan murni offline memanfaatkan IndexedDB lokal dengan enkripsi ringan browser.
*   **Cloud Hybrid Mode**: Proses onboarding terstruktur dari panduan penyalinan kode Apps Script, verifikasi identitas email, pengiriman kode OTP 6-digit terenkripsi, verifikasi kode, pembuatan sesi, hingga proses resolusi data awal (kosongkan, gunakan data cloud, atau muat demo).

### 4.2 Manajemen Aset Siklus Hidup (Lifecycle Asset Management)
*   **Siklus Hidup Aset**: Pencatatan status aset (Active, Stored, Under Repair, Sold, Disposed) dengan pelacakan penanggung jawab (*assigned user*), lokasi, serta pencatatan otomatis setiap kali terjadi mutasi penanggung jawab, status, dan lokasi ke dalam log riwayat (*Asset History*).
*   **Modul Kategori Khusus**:
    *   **Vehicle**: Detail kendaraan (No. Polisi, Tahun Pembuatan, Mileage, Pajak Tahunan, STNK 5 Tahunan) dengan fitur pencatatan log kilometer terpadu yang memperbarui status servis oli.
    *   **Device**: Informasi IMEI, nomor model, aksesoris, dan masa garansi.
    *   **SIM Card Manager**: Penyimpanan detail nomor kartu, penyedia layanan (provider), masa aktif kartu, masa tenggang, penanggung jawab, serta pemetaan ketergantungan akun (*account dependencies*) seperti WhatsApp, M-Banking, Tokopedia, Shopee, dll.

### 4.3 Log Servis, Pengingat Berkala, & TCO
*   **Log Servis**: Pencatatan log servis (tipe servis, tanggal, kilometer, biaya, penyedia jasa, dan catatan tambahan) dengan mekanisme pembaruan otomatis TCO aset.
*   **Pengingat Berkala (Recurring Reminders)**: Pengingat pintar dengan aturan pengulangan (None, Monthly, Quarterly, Semi-Annually, Annually) yang otomatis membuat instansi pengingat baru ketika status saat ini diubah menjadi *completed*.
*   **Total Cost of Ownership (TCO)**: Akumulasi biaya pembelian, servis berkala, perbaikan, aksesoris, dan kategori pengeluaran lainnya yang disinkronkan secara presisi antara basis data lokal dan Google Sheets.

### 4.4 Manajemen Dokumen & Vault Google Drive
*   **Penyimpanan Dokumen**: Pengunggahan file kuitansi pembelian, kartu garansi, atau STNK secara langsung melalui tangkapan kamera seluler atau unggahan file manual.
*   **Bypass & Enkripsi**: File diunggah sebagai base64 melalui Express proxy aman ke folder khusus Google Drive milik pengguna. URL Drive dikembalikan dan disimpan secara aman di basis data Sheets. Dokumen dapat dihapus secara permanen dari server lokal dan awan.

---

## 5. Kriteria Keberhasilan Rilis (Key Performance Indicators)
*   **Data Loss Rate = 0%**: Sistem antrean sinkronisasi tidak boleh kehilangan item data lokal sekalipun jaringan terputus di tengah jalan atau Apps Script mati.
*   **Zero Duplication**: Tidak ada data append ganda untuk servis, pengingat, maupun file dokumen saat sinkronisasi dibilas berulang kali secara paralel.
*   **Session-based Security**: Seluruh request mutasi data ke Apps Script ditolak jika `session_id` tidak terdaftar atau telah kedaluwarsa pada basis data Sheets pengguna.
*   **100% Type Safe**: Bebas dari ketidaksesuaian tipe (*type mismatch*) saat proses transpilisasi TypeScript.
