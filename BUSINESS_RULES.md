# Aturan & Logika Bisnis (BUSINESS_RULES.md) - MicroMate Hardened Edition

## 1. Aturan Resolusi Konflik Sinkronisasi (Distributed Conflict Rules)

### 1.1 Aturan Tombstone Penghapusan (DELETE > UPDATE)
*   **Definisi**: Jika suatu aset dihapus pada perangkat apa pun, status terhapus ini harus diutamakan di atas seluruh modifikasi data aset tersebut yang dikirim oleh perangkat lain yang belum menyerap informasi penghapusan.
*   **Implementasi**:
    *   Setiap kali aksi `deleteAsset` sukses dieksekusi di cloud, ID aset tersebut akan ditulis secara permanen ke dalam lembar kerja `DeletedAssets` (Tombstone).
    *   Jika sebuah antrean `syncAsset` dari perangkat lain tiba di Apps Script untuk aset yang ID-nya sudah terdaftar di sheet `DeletedAssets`, Apps Script wajib **menolak** request tersebut dan mengembalikan status sukses semu kepada perangkat pengirim agar antrean lokalnya dihapus, lalu menginstruksikan perangkat tersebut untuk menghapus aset tersebut secara lokal pada siklus pull data berikutnya.

### 1.2 Aturan Last-Write-Wins Berbasis Klien (Client Timestamp LWW)
*   **Definisi**: Perubahan pada baris data aset harus ditentukan berdasarkan waktu sunting aktual di sisi klien (`updated_at` dari browser klien), bukan berdasarkan waktu tibanya data di server sinkronisasi. Hal ini mencegah data suntingan yang lebih baru tertimpa oleh data usang dari perangkat yang baru saja mendapatkan sinyal internet.
*   **Implementasi**:
    *   Apps Script wajib membaca nilai kolom `Updated At` dari aset yang ada di Sheets sebelum menulis ulang data.
    *   Jika nilai `updated_at` dari payload permintaan klien lebih baru (lebih besar) daripada nilai `Updated At` yang tersimpan di Sheets, maka suntingan diterima dan ditulis.
    *   Jika nilai `updated_at` klien lebih lama (lebih kecil atau sama), maka suntingan ditolak, dan Apps Script akan memaksa klien tersebut untuk memperbarui datanya dengan data Sheets yang lebih baru saat siklus pull berikutnya berjalan.

---

## 2. Aturan Idempotensi Penulisan Data (Idempotency Policy)
Untuk mencegah timbulnya data duplikat akibat proses pengulangan sinkronisasi (*retry sync queue*), seluruh operasi penulisan log servis, pengingat, pengeluaran, berkas file, dan riwayat mutasi DILARANG KERAS menggunakan fungsi penambahan langsung (*direct appendRow*). Operasi tersebut wajib menerapkan fungsi **Upsert Berbasis Kunci Utama**:

### 2.1 Algoritma Upsert Berbasis Baris (Idempotent Row Upsert)
1.  Buka sheet target (misalnya `Maintenance`).
2.  Lakukan pencarian nilai pada kolom kunci utama (kolom pertama: `Maintenance ID` / `Reminder ID` / `Expense ID` / `Document ID`).
3.  Jika ID yang dicari **ditemukan**:
    *   Dapatkan baris index posisi ID tersebut.
    *   Lakukan pembaruan sel-sel pada baris tersebut dengan nilai data yang baru.
4.  Jika ID yang dicari **tidak ditemukan**:
    *   Tambahkan baris baru (*appendRow*) di bagian akhir lembar kerja untuk mendaftarkan data baru tersebut.

---

## 3. Aturan Logika Pengingat Berkala (Recurring Reminders Engine)
Ketika status sebuah pengingat yang berstatus aktif diubah menjadi `completed` oleh pengguna, sistem wajib menghitung jadwal jatuh tempo berikutnya berdasarkan aturan pengulangan (*repeat rule*) yang dikonfigurasi:

### 3.1 Formula Kalkulasi Tanggal Jatuh Tempo Berikutnya
Berdasarkan nilai kolom `repeat_rule`, formula penentuan tanggal jatuh tempo baru (`new_due_date`) dihitung dari tanggal jatuh tempo saat ini (`current_due_date`):

*   **`none`**: Tidak ada pembuatan pengingat baru. Pengingat lama murni diubah statusnya menjadi `completed`.
*   **`monthly`**: Tambahkan 1 bulan ke tanggal saat ini.
    *   *Formula*: `new_due_date = current_due_date + 1 Month`
*   **`quarterly`**: Tambahkan 3 bulan ke tanggal saat ini.
    *   *Formula*: `new_due_date = current_due_date + 3 Months`
*   **`semi_annually`**: Tambahkan 6 bulan ke tanggal saat ini.
    *   *Formula*: `new_due_date = current_due_date + 6 Months`
*   **`annually`**: Tambahkan 1 tahun ke tanggal saat ini.
    *   *Formula*: `new_due_date = current_due_date + 1 Year`
*   **`custom_km`**: Tambahkan interval kilometer target ke kilometer saat ini (Spesifik untuk kendaraan).
    *   *Formula*: `new_due_mileage = current_mileage + service_interval_km`

### 3.2 Idempotensi Pengingat Garansi (Warranty Reminder)
Setiap kali aset didaftarkan dengan jaminan garansi aktif, sistem secara otomatis melahirkan pengingat garansi di bawah pengingat terstruktur. ID dari pengingat garansi ini wajib menggunakan format kanonikal: **`war_rem_<asset_id>`**. Hal ini menjamin bahwa setiap kali aset disunting berkali-kali, pengingat garansi akan diperbarui secara idempotent (*updated*) tanpa pernah menciptakan pengingat garansi ganda.

---

## 4. Aturan Pembersihan Transisi Kategori (Category Transition Cleanup)
Untuk mencegah penumpukan metadata sampah yang dapat mengacaukan mesin pengingat visual (*Needs Attention Engine*), sistem wajib menerapkan aturan pembersihan ketat saat terjadi pergantian kategori aset:

*   Jika kategori aset berubah dari **`vehicle`** ke kategori lain:
    *   Sistem wajib menghapus baris relasi detail kendaraan (`vehicle_details`) dari IndexedDB lokal dan mengantrekan proses penghapusannya di awan.
*   Jika kategori aset berubah dari **`device`** ke kategori lain:
    *   Sistem wajib menghapus relasi `device_details`.
*   Jika kategori aset berubah menjadi **`sim_card`**:
    *   Sistem harus menginisialisasi parameter array `account_dependencies` sebagai array kosong `[]`, serta membersihkan `vehicle_details` dan `device_details`.

---

## 5. Aturan Perhitungan TCO (Total Cost of Ownership)
Nilai Total Cost of Ownership (TCO) dari suatu aset merupakan representasi akumulasi finansial siklus hidup aset tersebut. Formula TCO dirumuskan sebagai berikut:

$$\text{TCO} = \text{Harga Pembelian Aset} + \sum (\text{Biaya Servis}) + \sum (\text{Biaya Pengeluaran Tambahan})$$

Keterangan:
*   **Harga Pembelian Aset**: Nilai kolom `purchase_price` pada tabel aset.
*   **Biaya Servis**: Jumlah seluruh nilai kolom `cost` pada tabel `Maintenance` yang memiliki `asset_id` yang cocok.
*   **Biaya Pengeluaran Tambahan**: Jumlah seluruh nilai kolom `amount` pada tabel `Expenses` (pembelian aksesoris, perbaikan kecil, dll.) yang memiliki `asset_id` yang cocok.
*   *Aturan Konsistensi*: Seluruh elemen penyusun TCO (servis berkala, pengeluaran, harga beli) wajib disinkronkan ke awan secara presisi agar perhitungan TCO tetap konsisten setelah ditarik kembali dari awan (*reconciliation pull*).
