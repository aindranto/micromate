# Spesifikasi API & Kontrak Data (API_SPEC.md) - MicroMate Hardened Edition

## 1. Arsitektur Komunikasi & Otentikasi Sesi
Seluruh komunikasi dari browser klien menuju Google Apps Script dijembatani secara aman oleh server-side proxy Express di `/api/exec`. Klien wajib menyertakan alamat target Google Apps Script Web App dalam header khusus, serta mengautentikasi setiap permintaan mutasi menggunakan `session_id` terdaftar.

### 1.1 Header Permintaan Standar (Headers)
*   `Content-Type`: `application/json`
*   `X-Apps-Script-Url`: URL lengkap Web App Google Apps Script pengguna (diperoleh saat onboarding).

---

## 2. Spesifikasi Endpoint Proksi (`/api/exec`)

### 2.1 Aksi: `identify`
*   **Tujuan**: Mengidentifikasi status inisialisasi basis data Sheets dan mendeteksi email pemilik.
*   **Payload Permintaan (Request Body)**:
    ```json
    {
      "action": "identify"
    }
    ```
*   **Payload Respon Sukses (Response Body)**:
    ```json
    {
      "success": true,
      "emailMasked": "ain*****2@gmail.com",
      "initialized": true,
      "message": "Gateway teridentifikasi dengan sukses."
    }
    ```

### 2.2 Aksi: `requestOtp`
*   **Tujuan**: Menghasilkan kode OTP acak kriptografis 6-digit pada server, menyimpannya sementara di memori Apps Script (UserProperties/Cache), serta mengirimkannya ke email pemilik.
*   **Payload Permintaan**:
    ```json
    {
      "action": "requestOtp"
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "emailMasked": "ain*****2@gmail.com",
      "message": "Kode verifikasi OTP telah dikirimkan ke email terdaftar."
    }
    ```

### 2.3 Aksi: `verifyOtp`
*   **Tujuan**: Memvalidasi kecocokan OTP. Jika berhasil, server Apps Script mendaftarkan sesi baru ke dalam sheet `Sessions` dan mengembalikan ID Sesi berdurasi 30 hari.
*   **Payload Permintaan**:
    ```json
    {
      "action": "verifyOtp",
      "otp": "729401"
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "verified": true,
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "expires_at": "2026-09-14T11:42:00.000Z",
      "emailMasked": "ain*****2@gmail.com",
      "message": "Verifikasi berhasil. Sesi otentikasi baru telah diterbitkan."
    }
    ```

### 2.4 Aksi: `getAllAssets` (Pull & Sinkronisasi Masif)
*   **Tujuan**: Menarik seluruh kumpulan data aset dari Google Sheets, termasuk detail kendaraan, perangkat, jaminan garansi, log servis, pengingat, pengeluaran, berkas file, dan riwayat mutasi.
*   **Payload Permintaan**:
    ```json
    {
      "action": "getAllAssets",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026"
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "assets": [
        {
          "asset_id": "ast-921a-bc04",
          "workspace_id": "default",
          "category": "vehicle",
          "subcategory": "motorcycle",
          "name": "Honda Vario 150",
          "brand": "Honda",
          "model": "Vario 150 CBS",
          "serial_number": "MH1KF1111JK00000",
          "purchase_date": "2024-03-10",
          "purchase_price": 24500000,
          "purchase_location": "Dealer Honda Jakarta",
          "location": "Garasi Rumah",
          "status": "active",
          "notes": "Kendaraan operasional harian",
          "photo_url": "https://lh3.googleusercontent.com/d/1abc123xyz_drive_url",
          "assigned_user": "Andi Indranto",
          "account_dependencies": ["M-Banking BCA", "Tokopedia"],
          "created_at": "2024-03-10T08:00:00.000Z",
          "updated_at": "2026-08-15T04:00:00.000Z",
          "vehicle_details": {
            "vehicle_id": "veh-921a",
            "asset_id": "ast-921a-bc04",
            "vehicle_type": "motorcycle",
            "license_plate": "B 1234 ABC",
            "manufacture_year": 2024,
            "current_mileage": 12500,
            "last_service_mileage": 12000,
            "next_service_mileage": 15000,
            "last_oil_change_date": "2026-07-10",
            "last_oil_change_mileage": 12000,
            "next_oil_change_mileage": 14000,
            "annual_tax_date": "2027-03-10",
            "five_year_registration_date": "2029-03-10"
          },
          "device_details": null,
          "warranty": {
            "warranty_id": "war-921a",
            "asset_id": "ast-921a-bc04",
            "start_date": "2024-03-10",
            "end_date": "2027-03-10",
            "provider": "Astra Honda Motor",
            "warranty_type": "official",
            "warranty_number": "W-AHM-99120",
            "notes": "Garansi kelistrikan dan mesin utama"
          },
          "maintenance_records": [
            {
              "maintenance_id": "maint-1a2b",
              "asset_id": "ast-921a-bc04",
              "type": "oil_change",
              "date": "2026-07-10",
              "mileage": 12000,
              "cost": 150000,
              "provider": "AHASS Tebet",
              "notes": "Ganti oli mesin SPX2 & oli gardan",
              "next_date": "2026-10-10",
              "next_mileage": 14000,
              "created_at": "2026-07-10T10:00:00.000Z"
            }
          ],
          "reminders": [
            {
              "reminder_id": "rem-var-tax",
              "asset_id": "ast-921a-bc04",
              "type": "vehicle",
              "title": "Bayar Pajak Tahunan Vario",
              "due_date": "2027-03-10",
              "repeat_rule": "annually",
              "status": "upcoming",
              "created_at": "2026-08-15T04:00:00.000Z",
              "updated_at": "2026-08-15T04:00:00.000Z"
            }
          ],
          "documents": [
            {
              "document_id": "doc-var-stnk",
              "asset_id": "ast-921a-bc04",
              "type": "stnk",
              "name": "Foto STNK Vario.jpg",
              "file_url": "https://lh3.googleusercontent.com/d/1stnk123drive_url",
              "created_at": "2024-03-11T09:00:00.000Z"
            }
          ],
          "expenses": [
            {
              "expense_id": "exp-var-buy",
              "asset_id": "ast-921a-bc04",
              "type": "purchase",
              "amount": 24500000,
              "date": "2024-03-10",
              "description": "Pembayaran lunas unit motor"
            },
            {
              "expense_id": "exp-var-maint1",
              "asset_id": "ast-921a-bc04",
              "type": "maintenance",
              "amount": 150000,
              "date": "2026-07-10",
              "description": "Servis berkala & Ganti oli"
            }
          ],
          "history": [
            {
              "event_id": "hist-var-1",
              "asset_id": "ast-921a-bc04",
              "timestamp": "2024-03-10T08:00:00.000Z",
              "event_type": "CREATED",
              "title": "Aset didaftarkan",
              "old_value": null,
              "new_value": "Active",
              "performed_by": "Andi Indranto",
              "notes": "Registrasi pertama aset"
            }
          ]
        }
      ]
    }
  ```

### 2.5 Aksi: `syncAsset` (Upsert Aset & Sub-Detail)
*   **Tujuan**: Melakukan penambahan atau pembaruan baris data aset beserta detail spesifikasi kendaraan/perangkat, jaminan garansi, serta daftar ketergantungan akun.
*   **Payload Permintaan**:
    ```json
    {
      "action": "syncAsset",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "asset": {
        "asset_id": "ast-921a-bc04",
        "workspace_id": "default",
        "category": "vehicle",
        "subcategory": "motorcycle",
        "name": "Honda Vario 150",
        "brand": "Honda",
        "model": "Vario 150 CBS",
        "serial_number": "MH1KF1111JK00000",
        "purchase_date": "2024-03-10",
        "purchase_price": 24500000,
        "purchase_location": "Dealer Honda Jakarta",
        "location": "Garasi Rumah",
        "status": "active",
        "notes": "Kendaraan operasional harian",
        "photo_url": "https://lh3.googleusercontent.com/d/1abc123xyz_drive_url",
        "assigned_user": "Budi Hartono",
        "account_dependencies": ["WhatsApp"],
        "created_at": "2024-03-10T08:00:00.000Z",
        "updated_at": "2026-08-15T04:30:00.000Z",
        "vehicle_details": {
          "vehicle_id": "veh-921a",
          "asset_id": "ast-921a-bc04",
          "vehicle_type": "motorcycle",
          "license_plate": "B 1234 ABC",
          "manufacture_year": 2024,
          "current_mileage": 13000,
          "last_service_mileage": 12000,
          "next_service_mileage": 15000,
          "last_oil_change_date": "2026-07-10",
          "last_oil_change_mileage": 12000,
          "next_oil_change_mileage": 14000,
          "annual_tax_date": "2027-03-10",
          "five_year_registration_date": "2029-03-10"
        }
      }
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "message": "Data aset berhasil diperbarui di cloud."
    }
    ```

### 2.6 Aksi: `uploadFile` (Unggah Dokumen / Foto ke Drive)
*   **Tujuan**: Mengunggah berkas Base64 murni ke Google Drive, mengaturnya pada struktur folder yang rapi, mencatat metadatanya di sheet `AssetFiles`, serta mengembalikan URL akses langsung file.
*   **Payload Permintaan**:
    ```json
    {
      "action": "uploadFile",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "asset_id": "ast-921a-bc04",
      "file_category": "photo",
      "file_name": "Honda_Vario_Samping.png",
      "mime_type": "image/png",
      "base64_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
      "file_size": 1024
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "document_id": "doc-8c9d1a",
      "file_url": "https://lh3.googleusercontent.com/d/1abc123xyz_drive_url",
      "message": "Berkas berhasil diunggah ke Google Drive."
    }
    ```

### 2.7 Aksi: `syncMaintenance` (Upsert Riwayat Servis & Log Biaya)
*   **Tujuan**: Melakukan penambahan atau pembaruan baris servis berkala pada sheet `Maintenance` berdasarkan `maintenance_id`.
*   **Payload Permintaan**:
    ```json
    {
      "action": "syncMaintenance",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "maintenance": {
        "maintenance_id": "maint-1a2b",
        "asset_id": "ast-921a-bc04",
        "type": "oil_change",
        "date": "2026-07-10",
        "mileage": 12000,
        "cost": 150000,
        "provider": "AHASS Tebet",
        "notes": "Ganti oli mesin SPX2 & oli gardan",
        "next_date": "2026-10-10",
        "next_mileage": 14000,
        "created_at": "2026-07-10T10:00:00.000Z"
      }
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "message": "Data servis berhasil disimpan secara idempotent."
    }
    ```

### 2.8 Aksi: `syncReminder` (Upsert Pengingat Berkala)
*   **Tujuan**: Melakukan penambahan atau pembaruan baris pengingat pada sheet `Reminders` berdasarkan `reminder_id`.
*   **Payload Permintaan**:
    ```json
    {
      "action": "syncReminder",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "reminder": {
        "reminder_id": "rem-var-tax",
        "asset_id": "ast-921a-bc04",
        "type": "vehicle",
        "title": "Bayar Pajak Tahunan Vario",
        "due_date": "2027-03-10",
        "repeat_rule": "annually",
        "status": "upcoming",
        "created_at": "2026-08-15T04:00:00.000Z",
        "updated_at": "2026-08-15T04:00:00.000Z"
      }
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "message": "Data pengingat berkala berhasil disinkronkan."
    }
    ```

### 2.9 Aksi: `deleteAsset` (Penghapusan & Registrasi Tombstone)
*   **Tujuan**: Menghapus baris aset terkait dari lembar kerja `Assets` dan mendaftarkan ID aset tersebut ke dalam lembar kerja `DeletedAssets` (Tombstone).
*   **Payload Permintaan**:
    ```json
    {
      "action": "deleteAsset",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "asset_id": "ast-921a-bc04"
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "message": "Aset berhasil dihapus secara terpusat dan diregistrasikan di daftar tombstone."
    }
    ```

### 2.10 Aksi: `syncExpense` (Upsert Log Pengeluaran)
*   **Tujuan**: Melakukan penambahan atau pembaruan baris pengeluaran biaya pada sheet `Expenses` berdasarkan `expense_id` guna menghitung kalkulasi TCO yang stabil di awan.
*   **Payload Permintaan**:
    ```json
    {
      "action": "syncExpense",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "expense": {
        "expense_id": "exp-var-maint1",
        "asset_id": "ast-921a-bc04",
        "type": "maintenance",
        "amount": 150000,
        "date": "2026-07-10",
        "description": "Servis berkala & Ganti oli",
        "updated_at": "2026-07-10T10:00:00.000Z"
      }
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "message": "Log pengeluaran berhasil disinkronkan."
    }
    ```

### 2.11 Aksi: `syncHistory` (Sync Log Siklus Hidup Aset)
*   **Tujuan**: Melakukan penambahan log siklus hidup aset pada sheet `AssetHistory` berdasarkan `event_id`.
*   **Payload Permintaan**:
    ```json
    {
      "action": "syncHistory",
      "session_id": "sess_8f2b3c7d9e1a4f0b_2026",
      "history": {
        "event_id": "hist-var-1",
        "asset_id": "ast-921a-bc04",
        "timestamp": "2024-03-10T08:00:00.000Z",
        "event_type": "CREATED",
        "title": "Aset didaftarkan",
        "old_value": null,
        "new_value": "Active",
        "performed_by": "Andi Indranto",
        "notes": "Registrasi pertama aset"
      }
    }
    ```
*   **Payload Respon Sukses**:
    ```json
    {
      "success": true,
      "message": "Log siklus hidup aset berhasil dicatat di cloud."
    }
    ```
