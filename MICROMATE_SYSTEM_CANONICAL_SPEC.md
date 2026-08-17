# MICROMATE SYSTEM CANONICAL SPECIFICATION (MICROMATE_SYSTEM_CANONICAL_SPEC.md)
*Status: ARCHITECTURE FREEZE APPROVED*
*Version: v1.0 Hardened Release Candidate (RC)*

---

## 01 Product Scope
MicroMate dirancang secara eksklusif sebagai **Personal Asset Lifecycle Manager** yang berorientasi pada kepemilikan pribadi (*personal-first*). Aplikasi ini bertujuan membantu individu (seperti *digital workers*, *vehicle owners*, *family households*, dan *gadget enthusiasts*) mengelola siklus hidup aset mereka secara mandiri, aman, dan tanpa ketergantungan pada server pihak ketiga.

### Batasan Ruang Lingkup (Scope Boundaries)
*   **BUKAN Aplikasi Enterprise**: Segala bentuk kompleksitas tingkat perusahaan seperti Multi-Tenancy, Role-Based Access Control (RBAC) bertingkat, integrasi SSO (Single Sign-On), kepatuhan audit korporat (*corporate compliance*), dan konsol administrasi pusat dinonaktifkan dan berada di luar cakupan produk.
*   **Kepemilikan Data Penuh (*Privacy-First*)**: Seluruh data dan dokumen disimpan langsung pada media penyimpanan lokal pengguna (IndexedDB) dan akun awan Google Drive & Google Sheets pribadi mereka melalui perantara *Google Apps Script Web App Gateway* mandiri.
*   **Prinsip Kerja Offline-First**: Aplikasi harus dapat berfungsi 100% tanpa jaringan internet. Sinkronisasi data dilakukan secara asinkron menggunakan antrean perubahan (*Sync Queue*) ketika koneksi internet terdeteksi kembali.

---

## 02 User Flow
Alur perjalanan pengguna terbagi ke dalam empat fase utama yang terintegrasi:

```text
  [Mulai]
     │
     ▼
  [Layar Pertama: Onboarding & Setup]
     │
     ├──► Mode Demo: Jelajahi aplikasi dengan data simulasi lokal (Tanpa Sync)
     │
     └──► Mode Hubungkan Google Cloud Gateway
           │
           ▼
        [Masukkan URL Google Apps Script Web App]
           │
           ▼
        [Verifikasi Kepemilikan (Identify Email)] ◄─── Validasi domain Google & deteksi email owner
           │
           ▼
        [Kirim OTP ke Email Pemilik] ◄──────────────── Penggunaan Google MailApp aman (Masa berlaku 5m)
           │
           ▼
        [Masukkan Kode OTP 6-Digit di Browser]
           │
           ▼
        [Verifikasi OTP Sukses] ◄───────────────────── Pembuatan token Session ID acak (TTL 30 Hari)
           │
           ▼
        [MicroMate Terhubung (Connected)] ◄────────── Browser menyimpan Session ID & mengaktifkan Sync Mode
           │
           ▼
  [Aktivitas Utama: CRUD Lokal] ◄───────────────────── Operasi instan di IndexedDB (Siklus Offline-First)
     │
     ├──► Tambah/Edit Aset (Aset Baru, Riwayat Kepemilikan, Pengeluaran)
     ├──► Catat Servis Kendaraan & Update Odometer
     └──► Unggah Dokumen Pendukung (Foto Fisik, Nota Pembelian, STNK, dll.)
           │
           ▼
  [Pencatatan Antrean Sinkronisasi (Sync Queue)] ◄──── Transaksi diantrekan secara FIFO (First-In-First-Out)
     │
     ▼ [Internet Tersedia]
  [Pengurasan Antrean Mandiri (Sync Queue Flush)] ◄──── Mutex Lock aktif mencegah race condition paralel
     │
     ▼
  [Penyimpanan Awan: Google Sheets & Drive] ◄───────── Validasi Session ID di GAS Gateway sebelum menulis
```

---

## 03 Information Architecture
Struktur informasi MicroMate mengelompokkan entitas di bawah entitas utama **Asset**. Setiap mutasi pada entitas detail harus dikaitkan langsung ke `asset_id` yang valid untuk mencegah data yatim piatu (*orphan records*).

```text
                         ┌─────────────────────────┐
                         │   ASSET (Aset Utama)    │
                         │   - asset_id (PK)       │
                         │   - Category & Status   │
                         └────────────┬────────────┘
                                      │
         ┌────────────────────────────┼───────────────────────────┐
         │ (Relasi 1:1)               │ (Relasi 1:1)              │ (Relasi 1:1)
         ▼                            ▼                           ▼
┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
│ VEHICLE DETAILS  │         │  DEVICE DETAILS  │        │ SIM CARD DETAILS │
│ - License Plate  │         │  - IMEI          │        │ - Phone Number   │
│ - Mileage        │         │  - Accessories   │        │ - Dependencies   │
└──────────────────┘         └──────────────────┘        └──────────────────┘
         │
         │ (Relasi 1:N)
         ├────────────────────────────┬───────────────────────────┐
         ▼                            ▼                           ▼
┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
│  WARRANTY INFO   │         │SERVICES/REPAIR   │        │     EXPENSES     │
│ - Start/End Date │         │ - Cost & Mileage │        │ - Amount & Type  │
└──────────────────┘         └──────────────────┘        └──────────────────┘
         │
         ├────────────────────────────┬───────────────────────────┐
         ▼                            ▼                           ▼
┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
│    REMINDERS     │         │ ASSET DOCUMENTS  │        │  ASSET HISTORY   │
│ - Due Date & Rule│         │ - Drive File ID  │        │ - Owner Changes  │
└──────────────────┘         └──────────────────┘        │ - Lifecycle Logs │
                                                         └──────────────────┘
```

---

## 04 UI/UX Design System
Mengacu pada **Neutral Cool Slate Theme** untuk memaksimalkan fokus pengguna pada keterbacaan data, pelacakan odometer, serta grafik analitik pengeluaran:

### 1. Palet Warna & Ketentuan Kontras (Bright Slate Canvas)
*   **Latar Belakang Dasar**: Slate sangat muda (`bg-slate-50`, `#F8FAFC`).
*   **Kontainer Utama / Kartu**: Putih murni (`bg-white`, `#FFFFFF`). Selisih tingkat kecerahan (*brightness difference*) antara kontainer dan latar belakang dibatasi maksimum 7% untuk mencegah kelelahan mata.
*   **Aksen Status**:
    *   `Active / Verified`: Emerald Hijau (`text-emerald-600`, `bg-emerald-50`).
    *   `Needs Attention / Upcoming`: Amber Kuning (`text-amber-600`, `bg-amber-50`).
    *   `Overdue / Danger / Action Required`: Rose Merah (`text-rose-600`, `bg-rose-50`).

### 2. Layout Navigasi Jempol 4-Tab Bawah
Untuk kenyamanan interaksi satu tangan pada layar ponsel, navigasi utama diposisikan menetap di area bawah layar:
*   **Tab 1 (Beranda / Dashboard)**: Ringkasan indikator kritis ("Needs Attention") dan statistik biaya.
*   **Tab 2 (Aset / Asset List)**: Daftar lengkap aset, filter kategori, dan status operasional.
*   **Tombol Cepat Melayang (Floating Quick Action `+`)**: Berdiameter **56px** (`w-14 h-14 bg-emerald-600 shadow-lg text-white rounded-full`) diletakkan tepat di tengah-bawah navigasi untuk memicu modal transaksi instan (Catat Aset, Catat Servis, Tambah Pengingat).
*   **Tab 3 (Pemeliharaan / Maintenance)**: Rekam jejak servis, pergantian oli, dan riwayat biaya kendaraan.
*   **Tab 4 (Pengingat / Reminders & Settings)**: Pengendali tanggal jatuh tempo pajak, garansi, registrasi SIM card, dan tombol manajemen konektivitas gateway.

### 3. Nested Border Radius Rule
Setiap kartu bersarang (*nested cards*) wajib mengikuti kalkulasi kelengkungan sudut optik yang presisi agar visual tidak saling bertubrukan:
$$\text{Radius Dalam} = \text{Radius Luar} - \text{Jarak Padding Antara Keduanya}$$
*   *Contoh*: Jika radius kartu luar adalah `rounded-xl` (12px) dan jarak padding adalah `p-3` (12px), maka elemen di dalamnya menggunakan radius sudut tajam/siku `rounded-none` (0px).

---

## 05 Domain Model
Representasi data internal TypeScript disusun secara terisolasi tanpa ada *interface* yang tumpang tindih. Model ini menjadi acuan tunggal konversi data lokal ke awan.

```typescript
export type AssetCategory = 'device' | 'vehicle' | 'sim_card' | 'home' | 'other';
export type AssetStatus = 'active' | 'stored' | 'under_repair' | 'sold' | 'disposed';
export type VehicleType = 'car' | 'motorcycle';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom_km';
export type DocumentType = 'invoice' | 'warranty_card' | 'purchase_receipt' | 'stnk' | 'insurance' | 'service_receipt' | 'manual' | 'other';
export type ExpenseType = 'purchase' | 'maintenance' | 'repair' | 'accessories' | 'other';

export interface VehicleDetails {
  vehicle_id: string;
  asset_id: string;
  vehicle_type: VehicleType;
  license_plate: string;
  manufacture_year: number;
  current_mileage: number;
  last_service_mileage?: number;
  next_service_mileage?: number;
  last_oil_change_date?: string;
  last_oil_change_mileage?: number;
}

export interface DeviceDetails {
  device_id: string;
  asset_id: string;
  imei?: string;
  product_code?: string;
  model_number?: string;
  accessories?: string[];
}

export interface SIMCardDetails {
  sim_id: string;
  asset_id: string;
  phone_number: string;
  provider: string;
  active_until: string;
  registration_status: 'registered' | 'unregistered' | 'expired';
  account_dependencies: string[]; // Contoh: ["WhatsApp", "Tokopedia", "M-Banking", "Gmail"]
}

export interface Warranty {
  warranty_id: string;
  asset_id: string;
  start_date: string;
  end_date: string;
  provider: string;
  warranty_type: string;
  warranty_number?: string;
  notes?: string;
}

export interface MaintenanceRecord {
  maintenance_id: string;
  asset_id: string;
  type: string;
  date: string;
  mileage?: number;
  cost: number;
  provider?: string;
  notes?: string;
}

export interface Reminder {
  reminder_id: string;
  asset_id?: string;
  asset_name?: string;
  type: 'maintenance' | 'warranty' | 'vehicle' | 'documents' | 'payment' | 'sim_expiry' | 'custom';
  title: string;
  due_date: string;
  repeat_rule: RepeatRule;
  status: 'upcoming' | 'overdue' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface AssetDocument {
  document_id: string;
  asset_id: string;
  type: DocumentType;
  name: string;
  file_url: string; // Menyimpan ID dokumen privat Google Drive
  created_at: string;
}

export interface Expense {
  expense_id: string;
  asset_id: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description?: string;
}

export interface AssetHistoryEvent {
  event_id: string;
  asset_id: string;
  timestamp: string;
  action: 'CREATED' | 'USER_CHANGED' | 'STATUS_CHANGED' | 'METADATA_CHANGED' | 'DELETED' | 'RESTORED';
  field?: string;
  old_value?: string;
  new_value?: string;
  performed_by: string; // Nama perangkat atau identitas pembuat aksi
  notes?: string;
}

export interface Asset {
  asset_id: string;
  asset_code?: string;
  category: AssetCategory;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  location?: string;
  status: AssetStatus;
  notes?: string;
  photo_url?: string; // Dapat menyimpan Base64 lokal atau ID foto privat Drive
  assigned_user?: string; // User saat ini yang bertanggung jawab atas aset
  created_at: string;
  updated_at: string;
  deleted?: boolean; // Penanda logika soft-delete lokal
  
  vehicle_details?: VehicleDetails;
  device_details?: DeviceDetails;
  sim_details?: SIMCardDetails;
  warranty?: Warranty;
}
```

---

## 06 IndexedDB Schema (Dexie.js)
Database lokal dioperasikan secara transaksional dengan pendaftaran skema indeks pencarian yang dioptimalkan untuk kueri relasional asinkron:

```typescript
// Skema Inisialisasi Dexie DB
const db = new Dexie('MicroMateLocalDB');
db.version(1).stores({
  assets: 'asset_id, category, status, updated_at, deleted',
  sim_cards: 'sim_id, asset_id, phone_number',
  maintenance_records: 'maintenance_id, asset_id, date',
  reminders: 'reminder_id, asset_id, due_date, status',
  documents: 'document_id, asset_id, type',
  expenses: 'expense_id, asset_id, date, type',
  history: 'event_id, asset_id, timestamp, action',
  sync_queue: 'id, timestamp, action'
});
```

---

## 07 Google Sheets Schema (Normalized Cloud DB)
Spreadsheet bertindak sebagai database transaksional di awan. Untuk mencegah kelebihan muatan kerja formula dan mempermudah rekonsiliasi data, struktur disederhanakan menjadi **taksiran tepat 10 lembar kerja (*Sheets*) utama** dengan kolom-kolom statis berikut:

### 1. Sheet `Assets`
`asset_id` | `category` | `name` | `brand` | `model` | `serial_number` | `purchase_date` | `purchase_price` | `location` | `status` | `notes` | `photo_url` | `assigned_user` | `created_at` | `updated_at` | `deleted` | `vehicle_details` (JSON string) | `device_details` (JSON string) | `warranty` (JSON string)
*Catatan: Sub-detail spesifik kategori (kendaraan, perangkat elektronik, dan garansi) disimpan secara serial (JSON string) di dalam kolom utama demi efisiensi, kecepatan baca/tulis, dan mencegah kelebihan row lookup pada Google Sheets.*

### 2. Sheet `Services`
`maintenance_id` | `asset_id` | `type` | `date` | `mileage` | `cost` | `provider` | `notes`

### 3. Sheet `Reminders`
`reminder_id` | `asset_id` | `type` | `title` | `due_date` | `repeat_rule` | `status` | `created_at` | `updated_at`

### 4. Sheet `Documents`
`document_id` | `asset_id` | `type` | `name` | `file_url` | `created_at`

### 5. Sheet `Expenses`
`expense_id` | `asset_id` | `type` | `amount` | `date` | `description`

### 6. Sheet `AssetHistory`
`event_id` | `asset_id` | `timestamp` | `action` | `field` | `old_value` | `new_value` | `performed_by` | `notes`

### 7. Sheet `DeletedAssets` (Tombstone)
`asset_id` | `deleted_at`

### 8. Sheet `Sessions`
`session_hash` | `created_at` | `expires_at` | `last_used_at` | `device_id` | `status` | `paired_email`
*Catatan: Kolom `session_hash` menyimpan nilai SHA-256 hash dari session token mentah (plaintext), guna mencegah eksploitasi otorisasi jika basis data bocor ke publik.*

### 9. Sheet `LogSync`
`log_id` | `timestamp` | `session_hash` | `device_id` | `action` | `status` | `payload_summary` | `error_details`

### 10. Sheet `SIMCards`
`sim_id` | `asset_id` | `phone_number` | `provider` | `active_until` | `registration_status` | `account_dependencies` (JSON/Comma separated string)

---

## 08 Google Drive Structure (Private Vault)
MicroMate mengedepankan keamanan privasi berkas unggahan tanpa menggunakan tautan berbagi publik yang rentan bocor.

```text
[Akun Google Drive Pengguna]
    └── [Folder Utama: "MicroMate Vault" (Akses Terbatas: Private)]
            ├── [Berkas Nota / PDF / Gambar] (Akses: Hanya Pemilik Akun)
            └── [Aset Foto Utama] (Akses: Hanya Pemilik Akun)
```

### Mekanisme Ambil Berkas Aman (Base64 Relay Proxy)
1.  Semua berkas yang disimpan di folder Drive **tidak memiliki hak akses publik** (`ANYONE_WITH_LINK` dinonaktifkan).
2.  Saat browser meminta render gambar atau nota, browser memicu request `getFileBlob` ke Apps Script via Relay API `/api/exec` dengan parameter `session_id` yang valid.
3.  Apps Script memverifikasi masa aktif `session_id`. Jika valid, Apps Script memanggil `DriveApp.getFileById()`, membaca byte stream file secara internal, merubahnya menjadi skema Base64 aman, dan mengembalikannya ke browser:
    $$\text{Payload Response} = \text{JSON}(\text{file\_name}, \text{mime\_type}, \text{base64\_data})$$
4.  Browser merubah data tersebut menjadi lokal Object URL (`URL.createObjectURL` dari Blob) untuk dirender di halaman antarmuka. Hal ini menjamin file berharga tidak pernah terekspos ke publik bebas.

---

## 09 API Contract (Apps Script Web App)
Komunikasi klien ke Google Apps Script dijembatani secara eksklusif menggunakan **satu Endpoint HTTP POST tunggal** demi menyederhanakan perutean jaringan dan memotong pembatasan CORS browser.

### Payload Request Dasar (JSON)
Setiap mutasi atau penarikan data wajib menyertakan wrapper parameter berikut:
```json
{
  "session_id": "c7a8b3e5...f9a2", // Opaque token session
  "device_id": "Browser-Chrome-Android-XYZ",
  "action": "syncAsset" | "verifyOtp" | "getFileBlob" | "etc",
  "payload": { ... } // Payload spesifik aksi
}
```

### Definisi Aksi API Utama
1.  `identify`: Mendeteksi ketersediaan gateway dan mengembalikan surel penyamaran pemilik (`emailMasked`) tanpa mengekspos alamat email asli sebelum terverifikasi.
2.  `requestOtp`: Mengirimkan kode 6-digit ke email terdaftar di spreadsheet menggunakan `MailApp.sendEmail`.
3.  `verifyOtp`: Memvalidasi kode OTP, membuat sesi random 256-bit di sheet `Sessions` dan mengembalikannya ke klien.
4.  `pullAllData`: Menarik data inkremental seluruh sheet (Aset, Servis, Pengingat, Biaya, dll.) yang memiliki `updated_at` lebih baru dari timestamp pull terakhir milik klien.
5.  `syncAsset`: Melakukan operasi *Upsert* idempotent data aset (memperbarui baris jika ID ditemukan, atau menambahkan baris baru jika nihil).
6.  `syncMaintenance`: Pencatatan histori servis dan pemutakhiran odometer kendaraan terikat secara transaksional.
7.  `syncReminder`: Menyimpan data pengingat baru atau pengulangan jadwal berikutnya.
8.  `syncExpense`: Menyimpan data pengeluaran terperinci.
9.  `syncHistory`: Menambahkan log audit siklus hidup kepemilikan aset.
10. `deleteAsset`: Mendaftarkan ID aset ke dalam sheet `DeletedAssets` (Tombstone) untuk propagasi hapus massal perangkat lain.
11. `uploadFile`: Menerima base64 data dokumen untuk dibuat sebagai berkas privat di Google Drive dan mencatat informasinya di sheet `Documents`.
12. `getFileBlob`: Mengambil berkas privat Drive dan mengembalikannya dalam skema base64 stream terverifikasi.
13. `revokeSession`: Mencabut status sesi aktif dari sheet `Sessions` secara seketika.

---

## 10 OTP & Session Security
Keamanan otorisasi MicroMate sepenuhnya didesain ulang untuk membuang token akses statis yang rentan didekripsi atau dicuri:

### 1. Spesifikasi Teknis OTP
*   **Panjang Kode**: Tepat 6-digit angka acak kriptografis (`Math.random` yang dipadukan dengan mutasi garam internal Apps Script).
*   **Masa Berlaku**: Maksimum **5 menit** dari pembuatan.
*   **Sifat**: Sekali Pakai (*Single-Use*). Seketika setelah divalidasi (baik sukses maupun gagal), OTP dihapus dari memori server (`PropertiesService.getUserProperties()`).
*   **Batas Percobaan**: Maksimum **5 kali salah input** berturut-turut. Jika terlampaui, email pengirim akan diblokir dari generator OTP selama 2 jam.
*   **Cooldown Pengiriman**: Jeda antar pengiriman ulang (*resend*) minimum **45 detik**.

### 2. Spesifikasi Sesi (Opaque Bearer Token dengan Server-side Hashing)
*   **Struktur Token**: String acak kriptografis 256-bit dengan tingkat keunikan tinggi. Karakter berupa alfa-numerik non-prediktif. Token mentah (*plaintext* `session_token`) dikirimkan oleh browser di dalam header/payload request.
*   **Server-side Hashing**: Apps Script tidak pernah menyimpan token sesi mentah dalam database Google Sheets. Begitu menerima request, Apps Script menghitung nilai hash SHA-256:
    $$\text{session\_hash} = \text{SHA-256}(\text{session\_token})$$
    Semua kueri penemuan sesi, validasi, pembaruan waktu `last_used_at`, dan pencatatan sesi dilakukan menggunakan nilai `session_hash` ini. Hal ini memastikan privasi otorisasi 100% terjaga meskipun sheet `Sessions` bocor.
*   **Masa Aktif (TTL)**: Tepat **30 Hari**. Jika sesi telah melebihi batas 30 hari dari `created_at`, Apps Script akan menolak request dengan kode kesalahan `SESSION_EXPIRED` dan meminta pairing OTP ulang di sisi klien.
*   **Revocation (Pencabutan Sesi)**: Pengguna dapat menekan tombol "Putuskan Sesi" atau "Disconnect" di Settings, yang seketika mengirimkan perintah `revokeSession` untuk menghapus data sesi atau mengubah status baris di sheet `Sessions` menjadi `REVOKED` (berdasarkan pencarian hash) dan menghapus token lokal di browser.

---

## 11 Sync State Machine & Queue
Antrean sinkronisasi lokal (`sync_queue`) di IndexedDB bertindak sebagai penjamin integritas transaksi data ketika offline.

```text
       [Transaksi CRUD Baru]
                 │
                 ▼
     [Simpan Instan ke IndexedDB]
                 │
                 ▼
   [Tulis Perintah ke sync_queue]
                 │
                 ▼
      {Periksa Kondisi Jaringan}
                 │
                 ├─── Offline ──► [Tetap Antre & Tunggu Event 'online']
                 │
                 └─── Online ───► [Picu Pengurasan: flushSyncQueue()]
                                         │
                                         ▼
                               [Aktifkan Mutex Lock] ◄─── Menghindari eksekusi paralel ganda
                                         │
                                         ▼
                               [Ambil FIFO Queue Item]
                                         │
                                         ▼
                               [Kirim POST ke GAS]
                                         │
                      ┌──────────────────┴──────────────────┐
                      ▼ Sukses                              ▼ Gagal (Timeout/Jaringan)
             [Hapus Item dari Queue]              [Tingkatkan Retry Count & Backoff]
                      │                                     │
                      ▼                                     ▼
             [Lepas Mutex Lock]                    [Lepas Mutex & Re-schedule]
```

### Jeda Retensi & Eksponensial Backoff (Exponential Backoff Schedule)
Bila terjadi kegagalan pengiriman akibat gangguan sinyal atau habis waktu (*timeout*), antrean tidak boleh langsung dihantam ulang secara membabi buta. Algoritma jeda mundur diterapkan:
$$\text{Delay} = \min(2^{\text{retry\_count}} \times 1000\text{ms} + \text{jitter}, 300000\text{ms})$$
*Jitter* berupa angka acak antara 100ms hingga 500ms untuk melunakkan puncak beban transaksi (*thundering herd protection*).

---

## 12 Conflict Resolution (Last-Write-Wins)
Ketika beberapa perangkat mensinkronisasi data aset yang sama, konflik diselesaikan secara deterministik tanpa intervensi pop-up yang mengganggu pengguna:

1.  Setiap data mutasi di tingkat klien menyertakan parameter metadata waktu modifikasi terakhir klien (`updated_at` dengan format standar ISO 8601 UTC).
2.  Saat Apps Script menerima perubahan, ia membandingkan nilai `updated_at` dari payload masuk dengan nilai `updated_at` yang saat ini tercatat di baris Google Sheets:
    *   Jika $\text{updated\_at}_{\text{payload}} > \text{updated\_at}_{\text{sheet}}$, maka baris database Sheets diperbarui (*LWW - Last Write Wins*).
    *   Jika tidak, perubahan masuk diabaikan karena dianggap sebagai data usang (*stale update*). Klien kemudian dipaksa untuk menarik data terbaru awan pada siklus penarikan berikutnya.

---

## 13 Tombstone (Pencegahan Kebangkitan Data Hapus)
Masalah klasik offline-first adalah data yang telah dihapus oleh Perangkat A muncul kembali saat Perangkat B melakukan sinkronisasi karena Perangkat B menganggap data miliknya sebagai entitas baru yang belum ada di Sheets.

### Solusi Tombstone Terpusat
1.  Setiap penghapusan aset di tingkat klien tidak langsung menghapus baris secara fisik dari IndexedDB melainkan menandai kolom `deleted = true` dan mengantrekan aksi `deleteAsset` ke `sync_queue`.
2.  Saat diproses di awan, Apps Script akan:
    *   Mencatat `asset_id` dan timestamp penghapusan ke sheet `DeletedAssets`.
    *   Mengubah kolom `deleted` di sheet utama `Assets` menjadi `TRUE` (soft-delete awan).
3.  Setiap perangkat klien yang melakukan pull pemutakhiran data secara berkala akan membaca daftar ID dari sheet `DeletedAssets` dan langsung mengeksekusi penghapusan fisik dari IndexedDB lokal mereka.
4.  Jika ada client offline yang mencoba mengirimkan pembaruan data untuk `asset_id` yang sudah terdaftar di `DeletedAssets`, Apps Script akan menolak mutasi tersebut demi memelihara integritas hapus.

---

## 14 Asset History (Audit Trail Siklus Hidup Aset)
Untuk menjaga kredibilitas pelacakan kepemilikan aset personal (seperti perpindahan tangan gadget atau kendaraan dalam keluarga), MicroMate mengaktifkan sheet `AssetHistory` untuk merekam kejadian-kejadian signifikan berikut:

### Kategori Peristiwa yang Wajib Dicatat
*   `CREATED`: Ketika aset pertama kali didaftarkan.
*   `USER_CHANGED`: Rekaman eksplisit ketika penanggung jawab aset (`assigned_user`) berganti. Menyimpan nama pengguna lama di `old_value` dan pengguna baru di `new_value`.
*   `STATUS_CHANGED`: Perpindahan siklus hidup status dari `ACTIVE` menjadi `UNDER_REPAIR`, `SOLD`, atau `DISPOSED`.
*   `METADATA_CHANGED`: Pembaruan penting pada nomor seri, plat nomor kendaraan, atau data IMEI.
*   `DELETED` / `RESTORED`: Proses penghapusan secara logika atau pengembalian aset dari tempat sampah.

---

## 15 SIM Card Manager (Domain Unggulan)
Modul Kartu SIM dikembangkan sebagai sub-spesifikasi aset yang kokoh, bukan sekadar pelengkap visual:

### 1. Karakteristik Data & Relasi
Setiap aset berkategori `sim_card` akan terikat dengan data terperinci di sheet `SIMCards` dan dihubungkan secara otomatis dengan **Reminder Engine** untuk memantau masa aktif kartu agar tidak hangus.

### 2. Pelacak Ketergantungan Akun (Account Dependency Tracker)
Kartu SIM modern menjadi gerbang keamanan utama bagi akun-akun krusial digital. Kerusakan atau hangusnya kartu SIM dapat melumpuhkan akses perbankan dan e-commerce. Komponen ini melacak daftar ketergantungan tersebut:
*   Mencakup array referensi aplikasi kunci seperti: WhatsApp Business, Tokopedia, Shopee, Gmail Utama, Mobile Banking, dll.
*   Disajikan dalam grid visual interaktif dengan status *toggle* (Terhubung / Tidak) untuk memudahkan pengguna mengidentifikasi aplikasi mana saja yang wajib segera dimigrasikan nomor teleponnya jika kartu SIM tersebut akan di-disposed atau dijual.

---

## 16 Total Cost of Ownership (TCO)
Aplikasi menghitung biaya total kepemilikan aset secara dinamis untuk menyajikan visualisasi analisis biaya yang akurat pada Tab Cost Analytics:

$$\text{TCO} = \text{Harga Pembelian Aset} + \sum(\text{Biaya Servis}) + \sum(\text{Biaya Aksesoris \& Pengeluaran Lain})$$

### Aturan Kalkulasi TCO
*   Jika aset beralih status menjadi `SOLD`, harga penjualan dikurangi dari akumulasi TCO untuk menyajikan nilai akhir depresiasi aset yang sebenarnya kepada pengguna.
*   Biaya yang terekam pada sheet `Expenses` dan `Services` harus diagregasikan berdasarkan periode bulanan untuk menyajikan kurva pertumbuhan pengeluaran aset dari tahun ke tahun.

---

## 17 Reminder Engine & Recurring Rules
Mesin pengingat mengotomatisasi kalkulasi tanggal jatuh tempo untuk mencegah pengguna melewatkan tenggat penting:

### 1. Jenis Pemicu Pengingat
*   **Waktu (Time-Based)**: Berdasarkan sisa hari mendekati tanggal jatuh tempo STNK, masa berlaku garansi, atau masa aktif SIM Card. Indikator berubah menjadi Amber Kuning saat sisa waktu kurang dari 7 hari, dan Rose Merah jika sudah melewati hari H (*overdue*).
*   **Jarak Tempuh (Mileage-Based)**: Berdasarkan nilai odometer saat ini dari `VehicleDetails`. Pemicu servis berbunyi saat sisa kilometer mendekati nilai `next_service_mileage`.

### 2. Mekanisme Pengulangan Otomatis (*Recurring Engine*)
Saat sebuah pengingat dengan tipe repeat_rule tertentu ditandai selesai (`completed`) oleh pengguna, sistem tidak hanya merubah status melainkan otomatis melahirkan instansi pengingat baru di masa depan berdasarkan formula:

| Aturan Pengulangan | Penghitungan Tanggal Jatuh Tempo Baru |
| :--- | :--- |
| `daily` | $\text{due\_date}_{\text{baru}} = \text{due\_date}_{\text{lama}} + 1 \text{ hari}$ |
| `weekly` | $\text{due\_date}_{\text{baru}} = \text{due\_date}_{\text{lama}} + 7 \text{ hari}$ |
| `monthly` | $\text{due\_date}_{\text{baru}} = \text{due\_date}_{\text{lama}} + 1 \text{ bulan}$ |
| `quarterly` | $\text{due\_date}_{\text{baru}} = \text{due\_date}_{\text{lama}} + 3 \text{ bulan}$ |
| `semi_annually` | $\text{due\_date}_{\text{baru}} = \text{due\_date}_{\text{lama}} + 6 \text{ bulan}$ |
| `annually` | $\text{due\_date}_{\text{baru}} = \text{due\_date}_{\text{lama}} + 12 \text{ bulan}$ |
| `custom_km` | Odometer target berikutnya ditambah kelipatan odometer limit yang ditentukan |

---

## 18 Backup & Restore (Offline Portable Backup)
Sebagai asuransi kegagalan sinkronisasi atau bagi pengguna yang memilih tidak menggunakan awan Google sama sekali, MicroMate wajib menyediakan fasilitas ekspor/impor data manual:

*   **Format Ekspor**: File teks terkompresi JSON tunggal (`micromate_backup_YYYYMMDD.json`).
*   **Struktur Payload JSON**: Mengandung seluruh isi tabel IndexedDB lokal secara lengkap termasuk tabel metadata dan antrean perubahan.
*   **Logika Impor (Safeguard Merge)**: Saat file diimpor, sistem memindai database:
    *   Jika `asset_id` sudah ada di IndexedDB, ia membandingkan nilai `updated_at`. Data yang lebih baru akan menimpa data yang lebih usang (*merge resolution*).
    *   Mencegah duplikasi data ganda (*duplicate key violation*) dengan membungkus proses restorasi di dalam satu blok transaksi database Dexie tunggal.

---

## 19 Error Handling & Resiliency
Penanganan kegagalan koneksi diatur secara transparan untuk mencegah aplikasi membeku (*freezing*):

*   **Visual Retry Banner**: Banner tipis berwarna merah di atas layar muncul hanya saat antrean sinkronisasi tertahan akibat putusnya sinyal internet. Menampilkan indikator "Mencoba menghubungkan kembali dalam X detik..." dengan tombol manual "Sync Sekarang".
*   **Klasifikasi Kesalahan**:
    *   `AUTH_ERROR` (Sesi kedaluwarsa atau salah): Memaksa aplikasi membuka tab pairing OTP kembali secara otomatis.
    *   `RATE_LIMIT_ERROR`: Menunda eksekusi sinkronisasi selama 15 menit menggunakan sistem penundaan antrean.
    *   `GATEWAY_TIMEOUT` (Server GAS sibuk / batas 30s): Menahan antrean saat ini dan mengulang kembali dalam jeda 1 menit secara asinkron.

---

## 20 Setup Documentation
Bagian ini menyajikan panduan instalasi mandiri Google Apps Script Web App Gateway bagi pengguna awam:

1.  **Buka Google Sheets**: Buat spreadsheet baru bernama `MicroMate Database`.
2.  **Buka App Script editor**: Klik menu `Extensions` -> `Apps Script`.
3.  **Salin Kode Gateway**: Masukkan seluruh isi berkas script `appsScriptCode.gs` ke editor teks.
4.  **Deploy sebagai Web App**:
    *   Klik `Deploy` -> `New Deployment`.
    *   Pilih jenis deployment: `Web App`.
    *   Setel hak akses Execute as: `Me (Email Anda)`.
    *   Setel hak akses Who has access to: `Anyone` (PENTING agar browser klien dapat mengirimkan POST request, otorisasi keamanan akan ditangani secara internal oleh session token verifikasi OTP).
5.  **Salin URL Web App**: Ambil URL deployment Web App yang dihasilkan (contoh: `https://script.google.com/macros/s/.../exec`) dan tempelkan pada tab Onboarding MicroMate Anda.

---

## 21 QA Test Matrix
Matriks pengujian otomatis (dan manual) yang wajib dilewati sebelum MicroMate dinyatakan siap dirilis ke publik:

| ID Tes | Kategori Pengujian | Deskripsi Skenario Uji | Kriteria Sukses Minimum |
| :--- | :--- | :--- | :--- |
| **TC-01** | *Security & OTP* | Input URL GAS ilegal atau milik orang lain | Sistem menolak sambungan dan menampilkan "Invalid Gateway URL" |
| **TC-02** | *Security & OTP* | Pengiriman OTP beruntun tanpa jeda waktu | Sistem mengaktifkan cooldown 45 detik dan tombol "Resend" dinonaktifkan |
| **TC-03** | *Security & OTP* | Penggunaan OTP yang sama untuk kedua kali | Token ditolak dan dihapus seketika dari memori dengan pesan "OTP Expired" |
| **TC-04** | *Sync & Queue* | Simulasi koneksi terputus saat proses upload file | Transaksi disimpan di Sync Queue, status berubah menjadi 'offline', dan resume otomatis berjalan saat internet kembali aktif |
| **TC-05** | *Sync & Queue* | Balapan Mutex Sinkronisasi (Dua pemicu flush bersamaan) | Logger mencatat penolakan pemicu kedua karena Mutex `is_syncing` sedang aktif terkunci |
| **TC-06** | *Reconciliation* | Konflik LWW (Dua HP mengedit aset yang sama saat offline) | HP dengan timestamp `updated_at` paling baru yang memenangkan data di Google Sheets |
| **TC-07** | *Tombstone* | Hapus aset saat offline lalu online | Aset hilang dari HP, terdaftar di sheet `DeletedAssets`, dan terhapus otomatis di HP pasangan saat sync berjalan |
| **TC-08** | *SIM Card* | Pengujian pemutusan nomor SIM | Seluruh pengingat terkait ditandai kedaluwarsa, dan daftar dependensi menampilkan status peringatan merah |
