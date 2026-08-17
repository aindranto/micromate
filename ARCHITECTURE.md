# Arsitektur Sistem (ARCHITECTURE.md) - MicroMate Hardened Edition

## 1. Topologi Cetak Biru Sistem (System Blueprint)

```text
  ┌────────────────────────────────────────────────────────┐
  │                   LAPISAN KLIEN (React UI)             │
  │  ┌───────────────┐ ┌────────────────┐ ┌─────────────┐  │
  │  │   Dashboard   │ │ Asset Lifecycle│ │ SIM Manager │  │
  │  └───────┬───────┘ └────────┬───────┘ └──────┬──────┘  │
  │          │                  │                │         │
  │          ▼                  ▼                ▼         │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │           DATABASE MANAGER (IndexedDB)           │  │
  │  │       - localForage / Dexie.js Transaksional     │  │
  │  │       - Mutex Sync Lock (Flag is_syncing)        │  │
  │  └──────────────────────────┬───────────────────────┘  │
  └─────────────────────────────┼──────────────────────────┘
                                │
                                ▼ [Offline: Antre dalam SyncQueue]
                                │ [Online: Pemicu Flush Mandiri]
  ┌─────────────────────────────┼──────────────────────────┐
  │                 LAPISAN SERVER PROXY (Express)         │
  │  ┌──────────────────────────▼───────────────────────┐  │
  │  │          API Proxy Relay (/api/exec)             │  │
  │  │          - Payload Body Size Limit: 50MB         │  │
  │  │          - CORS Bypass & Timeout Handling (25s)  │  │
  │  └──────────────────────────┬───────────────────────┘  │
  └─────────────────────────────┼──────────────────────────┘
                                │
                                ▼ [Melalui HTTPS POST aman]
  ┌─────────────────────────────┼──────────────────────────┐
  │            LAPISAN PERSISTENSI AWAN (Google Cloud)     │
  │  ┌──────────────────────────▼───────────────────────┐  │
  │  │           Google Apps Script Web App             │  │
  │  │     - Validasi Sesi Terdaftar (Sessions Sheet)   │  │
  │  │     - Generator OTP Kriptografis (Secure PRNG)   │  │
  │  │     - Kontrol Logika Upsert Idempotent           │  │
  │  └──────────────┬──────────────────────────┬────────┘  │
  │                 │                          │           │
  │                 ▼                          ▼           │
  │     ┌───────────┴────────────┐ ┌───────────┴─────────┐ │
  │     │      Google Sheets     │ │     Google Drive    │ │
  │     │   - Metadata Assets    │ │    - Secure Vault   │ │
  │     │   - Log Servis & Biaya │ │    - Media & Foto   │ │
  │     │   - Sesi & Tombstones  │ │    - Dokumen PDF    │ │
  │     └────────────────────────┘ └─────────────────────┘ │
  └────────────────────────────────────────────────────────┘
```

---

## 2. Lapisan Penyimpanan Lokal (Local Storage & Offlining)
Aplikasi dibangun dengan prinsip **Offline-First**. Seluruh transaksi baca dan tulis dilakukan langsung terhadap basis data lokal IndexedDB klien.
*   **Keandalan Lokal**: IndexedDB menjamin bahwa data tetap persisten meskipun tab browser ditutup atau browser kehabisan memori sementara (tidak seperti *sessionStorage*).
*   **Transaksi Mandiri**: Jika perangkat dalam kondisi offline, operasi simpan tetap berjalan sukses di sisi antarmuka pengguna (*instant feedback*). Transaksi mutasi dibungkus sebagai modul perintah transaksi dan didaftarkan ke tabel `sync_queue`.

---

## 3. Mekanisme Mutex Lock Penguras Antrean (Sync Lock Guard)
Untuk melenyapkan balapan kondisi sinkronisasi (*Sync Race Condition*), sebuah pola **Mutex Lock** diterapkan pada manajer penguras antrean:

```typescript
class DatabaseManager {
  private is_syncing: boolean = false;

  public async flushSyncQueue(): Promise<boolean> {
    // 1. Periksa kunci Mutex
    if (this.is_syncing) {
      console.warn("[Sync] Penguras antrean sedang sibuk. Mengabaikan pemicuan paralel.");
      return false;
    }

    // 2. Aktifkan kunci
    this.is_syncing = true;

    try {
      // 3. Ambil antrean data secara terurut (FIFO)
      const queueItems = await this.getQueueItems();
      
      for (const item of queueItems) {
        // Proses pengiriman transaksi secara serial satu per satu
        const success = await this.executeSyncItem(item);
        if (success) {
          await this.removeFromQueue(item.id);
        } else {
          // Hentikan proses jika terjadi kegagalan jaringan/server untuk mencoba lagi nanti
          break; 
        }
      }
      
      return true;
    } finally {
      // 4. Bebaskan kunci dalam blok finally untuk menjamin kunci selalu terbuka pasca-eksekusi
      this.is_syncing = false;
    }
  }
}
```

---

## 4. Keamanan Sesi Gateway Berbasis OTP (OTP Pairing)
Model otentikasi lama yang menggunakan token statis dinonaktifkan sepenuhnya demi alasan keamanan. Sistem digantikan oleh **OTP-based Session Gateway**:

1.  **Pairing Identitas**: Klien menempelkan URL Apps Script dan memicu `identify`. Apps Script mengembalikan penyamaran email pemilik (`emailMasked`) yang terikat pada spreadsheet.
2.  **Tantangan OTP**: Klien memicu `requestOtp`. Apps Script membuat kode OTP acak kriptografis:
    $$\text{OTP} = \text{randomSecureInt}(100000, 999999)$$
    Kode ini disimpan dalam `PropertiesService.getUserProperties()` dengan waktu kedaluwarsa 5 menit, dan dikirimkan ke email terdaftar menggunakan `MailApp`.
3.  **Verifikasi & Penerbitan Sesi**: Klien mengirimkan OTP. Jika cocok, Apps Script menerbitkan `session_id` acak unik, menyimpannya di sheet `Sessions` bersama timestamp masa aktif 30 hari ke depan, lalu mengembalikannya ke klien.
4.  **Otorisasi Ketat**: Setiap mutasi berikutnya wajib melampirkan `session_id`. Apps Script memeriksa validitas sesi tersebut sebelum memproses data Sheets.

---

## 5. Keamanan Dokumen Google Drive (Private Storage Delivery)
Untuk mendukung privasi data (*Privacy-First*), berkas yang diunggah tidak boleh dibiarkan memiliki tautan berbagi publik (`ANYONE_WITH_LINK`). 

Sistem mengadopsi mekanisme **Secure Binary Blob Proxy**:
1.  Semua berkas di Google Drive disimpan dengan akses **Private Saja (Hanya Pemilik)**.
2.  Saat klien membutuhkan visualisasi foto atau dokumen, klien tidak mengakses URL Drive secara langsung (yang akan memicu kesalahan CORS atau meminta login Google tambahan).
3.  Klien mengirimkan request khusus `getFileBlob` dengan melampirkan `session_id` yang valid melalui proxy `/api/exec`.
4.  Google Apps Script mengambil file secara internal dari Drive, merubahnya menjadi format biner terenkripsi base64, lalu mengembalikannya ke browser klien untuk dirender sebagai objek lokal (*Object URL* atau *Data URL*).
5.  Hal ini menjamin kedaulatan privasi berkas 100% tanpa celah kebocoran tautan publik.
