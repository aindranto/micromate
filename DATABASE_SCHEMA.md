# Database & Spreadsheet Schema (DATABASE_SCHEMA.md) - MicroMate Hardened Edition

## 1. Skema Basis Data Lokal (IndexedDB - Klien)
Sistem menggunakan IndexedDB (diakses melalui wrapper Dexie.js atau localForage) sebagai basis data utama klien (*Offline-First*) yang terstruktur sebagai berikut:

### 1.1 Tabel: `assets`
*   **Kunci Utama (PK)**: `asset_id` (String / UUID)
*   **Kolom & Tipe Data**:
    *   `asset_code`: String (Opsional)
    *   `workspace_id`: String (FK ke `workspaces.workspace_id`)
    *   `category`: String (Daftar Kategori: `device`, `vehicle`, `home`, `camera`, `gaming`, `sim_card`, `other`)
    *   `subcategory`: String (Opsional)
    *   `name`: String (Wajib)
    *   `brand`: String (Opsional)
    *   `model`: String (Opsional)
    *   `serial_number`: String (Opsional)
    *   `purchase_date`: String / ISO-8601 (Opsional)
    *   `purchase_price`: Angka (Opsional, bawaan: `0`)
    *   `purchase_location`: String (Opsional)
    *   `location`: String (Opsional, lokasi fisik penempatan)
    *   `status`: String (Daftar Status: `active`, `stored`, `under_repair`, `sold`, `disposed`)
    *   `notes`: String (Opsional)
    *   `photo_url`: String / Data-URL Base64 atau Drive-URL
    *   `created_at`: String / ISO-8601 (Wajib)
    *   `updated_at`: String / ISO-8601 (Wajib)
    *   `deleted`: Boolean (Indikator tombstone lokal)
    *   `is_demo`: Boolean (Indikator data sampel)
    *   `data_origin`: String (Asal data: `demo`, `local`, `synced`)
    *   `assigned_user`: String (Nama penanggung jawab/pengguna aktif)
    *   `account_dependencies`: Array of String (Daftar layanan terikat untuk kartu SIM)

### 1.2 Tabel: `vehicle_details`
*   **Kunci Utama (PK)**: `vehicle_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-One*)
*   **Kolom & Tipe Data**:
    *   `vehicle_type`: String (`car` atau `motorcycle`)
    *   `license_plate`: String
    *   `manufacture_year`: Angka
    *   `current_mileage`: Angka
    *   `last_service_mileage`: Angka (Opsional)
    *   `next_service_mileage`: Angka (Opsional)
    *   `last_oil_change_date`: String / ISO-8601 (Opsional)
    *   `last_oil_change_mileage`: Angka (Opsional)
    *   `next_oil_change_mileage`: Angka (Opsional)
    *   `annual_tax_date`: String / ISO-8601 (Opsional)
    *   `five_year_registration_date`: String / ISO-8601 (Opsional)

### 1.3 Tabel: `device_details`
*   **Kunci Utama (PK)**: `device_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-One*)
*   **Kolom & Tipe Data**:
    *   `imei`: String (Opsional)
    *   `product_code`: String (Opsional)
    *   `model_number`: String (Opsional)
    *   `accessories`: Array of String

### 1.4 Tabel: `warranties`
*   **Kunci Utama (PK)**: `warranty_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-One*)
*   **Kolom & Tipe Data**:
    *   `start_date`: String / ISO-8601 (Wajib)
    *   `end_date`: String / ISO-8601 (Wajib)
    *   `provider`: String
    *   `warranty_type`: String (Daftar tipe: `official`, `distributor`, `store`, `extended`, `other`)
    *   `warranty_number`: String (Opsional)
    *   `notes`: String (Opsional)

### 1.5 Tabel: `maintenance_records`
*   **Kunci Utama (PK)**: `maintenance_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-Many*)
*   **Kolom & Tipe Data**:
    *   `type`: String (Daftar tipe: `routine_service`, `oil_change`, `tire`, `battery`, `brake`, `transmission`, `ac`, `repair`, `custom`)
    *   `date`: String / ISO-8601 (Wajib)
    *   `mileage`: Angka (Opsional)
    *   `cost`: Angka (Wajib)
    *   `provider`: String (Opsional)
    *   `notes`: String (Opsional)
    *   `next_date`: String / ISO-8601 (Opsional)
    *   `next_mileage`: Angka (Opsional)
    *   `created_at`: String / ISO-8601 (Wajib)

### 1.6 Tabel: `reminders`
*   **Kunci Utama (PK)**: `reminder_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-Many*)
*   **Kolom & Tipe Data**:
    *   `type`: String (Daftar tipe: `maintenance`, `warranty`, `vehicle`, `documents`, `payment`, `custom`)
    *   `title`: String (Wajib)
    *   `due_date`: String / ISO-8601 (Wajib)
    *   `repeat_rule`: String (Daftar aturan: `none`, `daily`, `weekly`, `monthly`, `quarterly`, `semi_annually`, `annually`, `custom_km`)
    *   `status`: String (Daftar status: `upcoming`, `overdue`, `completed`)
    *   `created_at`: String / ISO-8601 (Wajib)
    *   `updated_at`: String / ISO-8601 (Wajib)

### 1.7 Tabel: `asset_documents`
*   **Kunci Utama (PK)**: `document_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-Many*)
*   **Kolom & Tipe Data**:
    *   `type`: String (Daftar tipe: `invoice`, `warranty_card`, `purchase_receipt`, `stnk`, `insurance`, `service_receipt`, `manual`, `other`)
    *   `name`: String (Wajib)
    *   `file_url`: String (Drive-URL atau Base64 lokal)
    *   `created_at`: String / ISO-8601 (Wajib)

### 1.8 Tabel: `expenses`
*   **Kunci Utama (PK)**: `expense_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-Many*)
*   **Kolom & Tipe Data**:
    *   `type`: String (Daftar tipe: `purchase`, `maintenance`, `repair`, `accessories`, `other`)
    *   `amount`: Angka (Wajib)
    *   `date`: String / ISO-8601 (Wajib)
    *   `description`: String (Opsional)

### 1.9 Tabel: `asset_history`
*   **Kunci Utama (PK)**: `event_id` (String / UUID)
*   **Indeks Lain**: `asset_id` (FK ke `assets.asset_id` dengan hubungan *One-to-Many*)
*   **Kolom & Tipe Data**:
    *   `timestamp`: String / ISO-8601 (Wajib)
    *   `event_type`: String (Daftar tipe: `CREATED`, `USER_CHANGED`, `STATUS_CHANGED`, `LOCATION_CHANGED`, `SERVICE_RECORDED`, `NOTE_ADDED`)
    *   `title`: String (Wajib)
    *   `old_value`: String (Opsional)
    *   `new_value`: String (Opsional)
    *   `performed_by`: String (Opsional)
    *   `notes`: String (Opsional)

### 1.10 Tabel: `sync_queue`
*   **Kunci Utama (PK)**: `id` (String / UUID)
*   **Kolom & Tipe Data**:
    *   `action`: String (Daftar aksi: `saveAsset`, `uploadFile`, `syncMaintenance`, `syncReminder`, `deleteAsset`, `syncExpense`, `syncHistory`)
    *   `workspaceId`: String
    *   `data`: JSON String (Payload data transaksi terkait)
    *   `timestamp`: String / ISO-8601
    *   `retryCount`: Angka
    *   `lastAttemptAt`: String / ISO-8601
    *   `nextRetryAt`: String / ISO-8601
    *   `lastError`: String

---

## 2. Skema Basis Data Awan (Google Sheets - Server)
Google Spreadsheet berfungsi sebagai basis data relasional pusat dengan lembar kerja (*Sheets*) berikut sebagai representasi tabelnya:

### 2.1 Sheet: `Assets`
*   **Susunan Kolom (A - S)**:
    1.  `Asset ID` (PK)
    2.  `Workspace ID`
    3.  `Category`
    4.  `Subcategory`
    5.  `Name`
    6.  `Brand`
    7.  `Model`
    8.  `Serial Number`
    9.  `Purchase Date`
    10. `Purchase Price`
    11. `Purchase Location`
    12. `Location`
    13. `Status`
    14. `Notes`
    15. `Photo URL`
    16. `Assigned User`
    17. `Account Dependencies` (Disimpan sebagai teks gabungan dipisahkan koma)
    18. `Created At`
    19. `Updated At` (Penting untuk resolusi konflik LWW)

### 2.2 Sheet: `VehicleDetails`
*   **Susunan Kolom (A - M)**:
    1.  `Vehicle ID` (PK)
    2.  `Asset ID` (FK)
    3.  `Vehicle Type`
    4.  `License Plate`
    5.  `Manufacture Year`
    6.  `Current Mileage`
    7.  `Last Service Mileage`
    8.  `Next Service Mileage`
    9.  `Last Oil Change Date`
    10. `Last Oil Change Mileage`
    11. `Next Oil Change Mileage`
    12. `Annual Tax Date`
    13. `Five Year Registration Date`

### 2.3 Sheet: `DeviceDetails`
*   **Susunan Kolom (A - F)**:
    1.  `Device ID` (PK)
    2.  `Asset ID` (FK)
    3.  `IMEI`
    4.  `Product Code`
    5.  `Model Number`
    6.  `Accessories` (Dipisahkan koma)

### 2.4 Sheet: `Warranties`
*   **Susunan Kolom (A - H)**:
    1.  `Warranty ID` (PK)
    2.  `Asset ID` (FK)
    3.  `Start Date`
    4.  `End Date`
    5.  `Provider`
    6.  `Warranty Type`
    7.  `Warranty Number`
    8.  `Notes`

### 2.5 Sheet: `Maintenance`
*   **Susunan Kolom (A - K)**:
    1.  `Maintenance ID` (PK)
    2.  `Asset ID` (FK)
    3.  `Type`
    4.  `Date`
    5.  `Mileage`
    6.  `Cost`
    7.  `Provider`
    8.  `Notes`
    9.  `Next Date`
    10. `Next Mileage`
    11. `Created At`

### 2.6 Sheet: `Reminders`
*   **Susunan Kolom (A - H)**:
    1.  `Reminder ID` (PK)
    2.  `Asset ID` (FK)
    3.  `Type`
    4.  `Title`
    5.  `Due Date`
    6.  `Repeat Rule`
    7.  `Status`
    8.  `Created At`

### 2.7 Sheet: `AssetFiles`
*   **Susunan Kolom (A - H)**:
    1.  `Document ID` (PK)
    2.  `Asset ID` (FK)
    3.  `File Category` (`photo` atau `document`)
    4.  `File Name`
    5.  `File URL` (Tautan ke file di Google Drive)
    6.  `MIME Type`
    7.  `File Size`
    8.  `Uploaded At`

### 2.8 Sheet: `Expenses`
*   **Susunan Kolom (A - G)**:
    1.  `Expense ID` (PK)
    2.  `Asset ID` (FK)
    3.  `Type`
    4.  `Amount`
    5.  `Date`
    6.  `Description`
    7.  `Updated At`

### 2.9 Sheet: `AssetHistory`
*   **Susunan Kolom (A - I)**:
    1.  `Event ID` (PK)
    2.  `Asset ID` (FK)
    3.  `Timestamp`
    4.  `Event Type`
    5.  `Title`
    6.  `Old Value`
    7.  `New Value`
    8.  `Performed By`
    9.  `Notes`

### 2.10 Sheet: `DeletedAssets` (Tombstone Terpusat)
*   **Susunan Kolom (A - B)**:
    1.  `Asset ID` (PK)
    2.  `Deleted At` (Timestamp penghapusan)

### 2.11 Sheet: `Sessions` (Keamanan Gateway Sesi)
*   **Susunan Kolom (A - D)**:
    1.  `Session ID` (PK - UUID/Token acak kriptografis)
    2.  `Owner Email` (Disimpan utuh di awan, tidak diekspos mentah ke browser)
    3.  `Created At`
    4.  `Expires At` (Masa kedaluwarsa sesi)

### 2.12 Sheet: `LogSync`
*   **Susunan Kolom (A - F)**:
    1.  `Log ID` (PK)
    2.  `Action` (Jenis aksi sinkronisasi)
    3.  `Entity ID` (ID entitas terkait, contoh: Asset ID)
    4.  `Timestamp`
    5.  `Status` (`SUCCESS` atau `FAILED`)
    6.  `Error Message`
