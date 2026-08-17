import { dbManager } from './db';
import { Asset, AssetHistoryEvent, SyncQueueItem } from '../types';

export interface TestLogEntry {
  id: string;
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  logs: string[];
}

/**
 * Runs the Phase 2C - Local Database Contract Tests
 * Returns a list of log entries for each test layer
 */
export async function runContractTests(): Promise<TestLogEntry[]> {
  const results: TestLogEntry[] = [];
  const testAssetId = `test_ast_vmax_${Date.now()}`;

  // Helper to record a test suite run
  const runSuite = async (
    id: string,
    name: string,
    testFn: (logs: string[]) => Promise<void>
  ) => {
    const logs: string[] = [];
    const startTime = performance.now();
    try {
      logs.push(`Memulai test suite: ${name}`);
      await testFn(logs);
      logs.push(`Test suite berhasil diselesaikan.`);
      results.push({
        id,
        name,
        success: true,
        duration: Math.round(performance.now() - startTime),
        logs,
      });
    } catch (err: any) {
      logs.push(`❌ EROR: ${err.message || err}`);
      results.push({
        id,
        name,
        success: false,
        duration: Math.round(performance.now() - startTime),
        error: err.toString(),
        logs,
      });
    }
  };

  // ---------------------------------------------------------
  // TEST A: Local Persistence (Save & Read Complex Entities)
  // ---------------------------------------------------------
  await runSuite('test_a_persistence', 'TEST A — Local Persistence (Dexie / IndexedDB)', async (logs) => {
    logs.push('Mempersiapkan objek aset kompleks dengan SIM, Kendaraan, Pengingat, dan Dokumen.');

    const sampleAsset: Asset = {
      asset_id: testAssetId,
      asset_code: 'TEST-VMAX-01',
      workspace_id: 'ws_personal',
      category: 'vehicle',
      subcategory: 'Sepeda Motor',
      name: 'Yamaha VMAX 1700cc Enterprise',
      brand: 'Yamaha',
      model: 'VMAX',
      serial_number: 'YAM-VMAX-998822',
      purchase_date: '2026-01-15',
      purchase_price: 350000000,
      purchase_location: 'Yamaha Flagship Jakarta',
      location: 'Garasi Depan Kantor',
      status: 'active',
      notes: 'Aset pengujian kontrak database lokal.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_user: 'Andi Pratama',
      data_origin: 'local',
      
      // Detail kendaraan
      vehicle_details: {
        vehicle_id: `v_${testAssetId}`,
        asset_id: testAssetId,
        vehicle_type: 'motorcycle',
        license_plate: 'B 1234 VMX',
        manufacture_year: 2024,
        current_mileage: 1200,
        last_service_mileage: 1000,
        next_service_mileage: 2000,
        last_oil_change_date: '2026-05-10',
        last_oil_change_mileage: 1000,
        next_oil_change_mileage: 2000,
        annual_tax_date: '2027-01-15',
        five_year_registration_date: '2031-01-15'
      },

      // Detail SIM Card telemetri terintegrasi
      sim_details: {
        sim_id: `sim_${testAssetId}`,
        asset_id: testAssetId,
        phone_number: '081299998888',
        provider: 'Telkomsel IoT Enterprise',
        active_until: '2027-08-15',
        registration_status: 'registered',
        account_dependencies: ['BCA Mobile SIM-Binding', 'WhatsApp OTP Server', 'Tokopedia Vendor Sync']
      },

      // Garansi
      warranty: {
        warranty_id: `w_${testAssetId}`,
        asset_id: testAssetId,
        start_date: '2026-01-15',
        end_date: '2029-01-15',
        provider: 'Yamaha Indonesia Motor Mfg',
        warranty_type: 'official',
        warranty_number: 'WR-YAM-772211',
        notes: 'Garansi mesin 3 tahun penuh.'
      },

      // Catatan pemeliharaan / service
      maintenance_records: [
        {
          maintenance_id: `m1_${testAssetId}`,
          asset_id: testAssetId,
          type: 'routine_service',
          date: '2026-05-10',
          mileage: 1000,
          cost: 450000,
          provider: 'Yamaha Flagship Bengkel',
          notes: 'Servis perdana 1000km gratis jasa, ganti oli mesin oli filter.',
          created_at: new Date().toISOString()
        }
      ],

      // Pengingat
      reminders: [
        {
          reminder_id: `r1_${testAssetId}`,
          asset_id: testAssetId,
          asset_name: 'Yamaha VMAX 1700cc Enterprise',
          type: 'vehicle',
          title: 'STNK Jatuh Tempo B 1234 VMX',
          due_date: '2027-01-15',
          repeat_rule: 'annually',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],

      // Metadata dokumen pendukung
      documents: [
        {
          document_id: `d1_${testAssetId}`,
          asset_id: testAssetId,
          type: 'stnk',
          name: 'STNK Yamaha VMAX.pdf',
          file_url: 'https://drive.google.com/file/d/test_stnk_doc_id/view',
          created_at: new Date().toISOString()
        }
      ],

      // Rincian biaya pembelian / modal awal
      expenses: [
        {
          expense_id: `e1_${testAssetId}`,
          asset_id: testAssetId,
          type: 'purchase',
          amount: 350000000,
          date: '2026-01-15',
          description: 'Pembayaran DP & Pelunasan Unit Baru Yamaha VMAX'
        }
      ]
    };

    logs.push(`Menyimpan aset uji ke IndexedDB melalui dbManager.saveAsset(). ID: ${testAssetId}`);
    await dbManager.saveAsset(sampleAsset, 'ws_personal');
    logs.push('Aset sukses disimpan.');

    logs.push(`Mengambil kembali aset dari database menggunakan getAssetById("${testAssetId}")`);
    const retrieved = await dbManager.getAssetById(testAssetId, 'ws_personal');

    if (!retrieved) {
      throw new Error(`Aset dengan ID ${testAssetId} gagal ditemukan kembali di database!`);
    }

    logs.push('Aset ditemukan. Memverifikasi keselarasan properti tersemat (deep nesting contract check)...');

    // Assertions
    if (retrieved.name !== sampleAsset.name) {
      throw new Error(`Asertasi Gagal: Nama aset tidak cocok! Diperoleh "${retrieved.name}", diharapkan "${sampleAsset.name}"`);
    }
    if (retrieved.assigned_user !== 'Andi Pratama') {
      throw new Error(`Asertasi Gagal:assigned_user tidak cocok! Diperoleh "${retrieved.assigned_user}"`);
    }

    // Vehicle Details Assertion
    if (!retrieved.vehicle_details || retrieved.vehicle_details.license_plate !== 'B 1234 VMX') {
      throw new Error('Asertasi Gagal: Detail Kendaraan (license_plate) tidak tersimpan atau tidak cocok!');
    }
    logs.push('✓ Detail Kendaraan terverifikasi cocok.');

    // SIM Card Details Assertion
    if (!retrieved.sim_details || retrieved.sim_details.phone_number !== '081299998888') {
      throw new Error('Asertasi Gagal: Detail SIM Card tidak tersimpan atau tidak cocok!');
    }
    if (retrieved.sim_details.account_dependencies.length !== 3) {
      throw new Error(`Asertasi Gagal: SIM dependencies harus berukuran 3, ditemukan ${retrieved.sim_details.account_dependencies.length}`);
    }
    logs.push('✓ Detail SIM Card dan integrasi dependencies terverifikasi cocok.');

    // Warranty, documents & records
    if (!retrieved.warranty || retrieved.warranty.warranty_number !== 'WR-YAM-772211') {
      throw new Error('Asertasi Gagal: Detail Garansi tidak cocok!');
    }
    if (!retrieved.maintenance_records || retrieved.maintenance_records.length !== 1) {
      throw new Error('Asertasi Gagal: Catatan pemeliharaan hilang!');
    }
    if (!retrieved.documents || retrieved.documents.length !== 1) {
      throw new Error('Asertasi Gagal: Dokumen pendukung hilang!');
    }
    if (!retrieved.expenses || retrieved.expenses.length !== 1) {
      throw new Error('Asertasi Gagal: Catatan finansial hilang!');
    }

    logs.push('✓ Kontrak persistensi data kompleks IndexedDB lulus verifikasi total.');
  });

  // ---------------------------------------------------------
  // TEST B: History Generation (Audit Logging Engine)
  // ---------------------------------------------------------
  await runSuite('test_b_history', 'TEST B — Automated Lifecycle History Generation', async (logs) => {
    logs.push(`Mengambil aset uji "${testAssetId}" untuk melakukan pengujian pelacakan mutasi.`);
    const asset = await dbManager.getAssetById(testAssetId, 'ws_personal');
    if (!asset) {
      throw new Error('Aset pengujian hilang dari database untuk uji riwayat!');
    }

    logs.push(`Pemeriksaan awal: Seharusnya riwayat memiliki minimal log pendaftaran.`);
    if (!asset.history || asset.history.length === 0) {
      throw new Error('Asertasi Gagal: Riwayat awal pendaftaran (CREATED) tidak otomatis terbentuk!');
    }
    logs.push(`✓ Riwayat pendaftaran terverifikasi: ${asset.history[0].action} - ${asset.history[0].field}`);

    // Mutasi 1: Pergantian Pengguna
    logs.push('Mensimulasikan pergantian penanggung jawab / pengguna: Andi Pratama -> Budi Santoso');
    asset.assigned_user = 'Budi Santoso';
    await dbManager.saveAsset(asset, 'ws_personal');

    // Ambil lagi
    const afterUserChange = await dbManager.getAssetById(testAssetId, 'ws_personal');
    if (!afterUserChange || !afterUserChange.history) {
      throw new Error('Gagal mengambil data aset setelah mutasi pengguna.');
    }

    logs.push(`Jumlah entri riwayat saat ini: ${afterUserChange.history.length}`);
    const userEvent = afterUserChange.history.find(h => h.action === 'USER_CHANGED');
    if (!userEvent) {
      throw new Error('Asertasi Gagal: Log USER_CHANGED tidak dihasilkan secara otomatis!');
    }
    if (userEvent.old_value !== 'Andi Pratama' || userEvent.new_value !== 'Budi Santoso') {
      throw new Error(`Asertasi Gagal: Nilai lama/baru log pengguna tidak tepat! Lama: "${userEvent.old_value}", Baru: "${userEvent.new_value}"`);
    }
    logs.push('✓ Log USER_CHANGED terdeteksi sempurna dengan penelusuran lama & baru.');

    // Mutasi 2: Perubahan Status
    logs.push('Mensimulasikan perubahan status operasional: active -> under_repair');
    afterUserChange.status = 'under_repair';
    await dbManager.saveAsset(afterUserChange, 'ws_personal');

    const afterStatusChange = await dbManager.getAssetById(testAssetId, 'ws_personal');
    if (!afterStatusChange || !afterStatusChange.history) {
      throw new Error('Gagal mengambil data aset setelah mutasi status.');
    }

    const statusEvent = afterStatusChange.history.find(h => h.action === 'STATUS_CHANGED');
    if (!statusEvent) {
      throw new Error('Asertasi Gagal: Log STATUS_CHANGED tidak dihasilkan secara otomatis!');
    }
    logs.push(`✓ Log STATUS_CHANGED sukses dihasilkan: "${statusEvent.old_value}" -> "${statusEvent.new_value}"`);

    // Mutasi 3: Perubahan Lokasi (Metadata)
    logs.push('Mensimulasikan perubahan lokasi: "Garasi Depan Kantor" -> "Bengkel Pusat Yamaha"');
    afterStatusChange.location = 'Bengkel Pusat Yamaha';
    await dbManager.saveAsset(afterStatusChange, 'ws_personal');

    const afterLocationChange = await dbManager.getAssetById(testAssetId, 'ws_personal');
    if (!afterLocationChange || !afterLocationChange.history) {
      throw new Error('Gagal mengambil data aset setelah mutasi lokasi.');
    }

    const metadataEvent = afterLocationChange.history.find(h => h.action === 'METADATA_CHANGED' && h.field === 'Lokasi');
    if (!metadataEvent) {
      throw new Error('Asertasi Gagal: Log METADATA_CHANGED untuk Lokasi tidak dihasilkan secara otomatis!');
    }
    logs.push('✓ Log METADATA_CHANGED untuk penyesuaian lokasi penempatan terdeteksi sempurna.');
  });

  // ---------------------------------------------------------
  // TEST C: Sync Queue Verification (Offline Synchronization)
  // ---------------------------------------------------------
  await runSuite('test_c_sync_queue', 'TEST C — Sync Queue Mutation Lifecycle (Offline Sync)', async (logs) => {
    logs.push('Membaca seluruh item di dalam antrean sinkronisasi (Sync Queue)...');
    const queue = await dbManager.getAllSyncQueueItems();
    logs.push(`Ditemukan ${queue.length} transaksi di antrean sinkronisasi.`);

    // Find the saveAsset transaction for our test VMAX
    const vmaxQueueItems = queue.filter(item => {
      const data = item.data || {};
      return data.asset_id === testAssetId || data.assetId === testAssetId;
    });

    logs.push(`Transaksi terdeteksi untuk aset uji ${testAssetId}: ${vmaxQueueItems.length} transaksi.`);
    if (vmaxQueueItems.length === 0) {
      throw new Error('Asertasi Gagal: Tidak ada item antrean sinkronisasi yang terdaftar untuk aset pengujian baru!');
    }

    // Inspect the saveAsset action
    const saveAction = vmaxQueueItems.find(item => item.action === 'saveAsset');
    if (!saveAction) {
      throw new Error('Asertasi Gagal: Antrean aksi "saveAsset" tidak terdaftar di Sync Queue!');
    }

    logs.push(`✓ Aksi "saveAsset" terkonfirmasi dalam antrean dengan ID Sesi: ${saveAction.id}`);
    logs.push(`Isi payload transaksi: ${JSON.stringify(saveAction.data).substring(0, 100)}...`);

    // Clean up our test asset to keep database clean
    logs.push(`Mengeksekusi pembersihan aset uji "${testAssetId}" dari sistem lokal.`);
    await dbManager.deleteAssetLocallyWithoutQueue(testAssetId);
    
    // Remove sync queue entries created during this contract test
    logs.push('Membersihkan antrean pengujian agar tidak menyumbat server sinkronisasi Google Sheets asli.');
    for (const item of vmaxQueueItems) {
      await dbManager.removeSyncQueueItem(item.id);
    }
    logs.push('✓ Pembersihan sandboxing pengujian berhasil.');
  });

  // ---------------------------------------------------------
  // TEST D: Cloud Reconciliation & Multi-Device Conflict Resolution (Phase 2E)
  // ---------------------------------------------------------
  await runSuite('test_d_multi_device_conflict', 'TEST D — Multi-Device Consistency & Tombstone Priority (Phase 2E)', async (logs) => {
    logs.push('Memulai pengujian multi-device conflict resolution & tombstone priority...');
    
    // Test 1: Tombstone Priority (DELETE > UPDATE)
    const tombstoneId = `tomb_${Date.now()}`;
    const tombstones = new Set<string>([tombstoneId]);
    const remoteZombie: Asset = {
      asset_id: tombstoneId,
      workspace_id: 'ws_personal',
      category: 'device',
      name: 'Zombie Laptop',
      purchase_date: '2024-01-01',
      purchase_price: 10000000,
      status: 'active',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString()
    };

    const resTomb = (await import('./conflictResolution')).ConflictResolutionEngine.resolveAssetConflict(
      null,
      remoteZombie,
      [],
      tombstones
    );

    if (resTomb.action !== 'TOMBSTONE_DELETE') {
      throw new Error('Asertasi Gagal: Tombstone priority dilanggar (zombie asset bangkit kembali)!');
    }
    logs.push('✓ Tombstone Priority (DELETE > UPDATE) diverifikasi: update dari remote ditolak.');

    // Test 2: Timestamp Authoritative (Newer Remote Wins)
    const localAsset: Asset = {
      asset_id: `ast_ts_${Date.now()}`,
      workspace_id: 'ws_personal',
      category: 'device',
      name: 'ThinkPad T14 (Local Old)',
      purchase_date: '2024-01-01',
      purchase_price: 18000000,
      status: 'active',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z'
    };

    const newerRemote: Asset = {
      ...localAsset,
      name: 'ThinkPad T14 (Remote New)',
      updated_at: '2025-02-01T00:00:00.000Z'
    };

    const resTimestamp = (await import('./conflictResolution')).ConflictResolutionEngine.resolveAssetConflict(
      localAsset,
      newerRemote,
      [],
      new Set()
    );

    if (resTimestamp.action !== 'APPLY_REMOTE' || resTimestamp.asset?.name !== 'ThinkPad T14 (Remote New)') {
      throw new Error('Asertasi Gagal: Remote version yang lebih baru tidak diterapkan!');
    }
    logs.push('✓ Server Authoritative Timestamp Ordering terverifikasi.');

    // Test 3: Pending Mutation Safeguard
    const pendingQueueItem: SyncQueueItem = {
      id: 'q_pending_1',
      mutation_id: 'MUT-TEST-PENDING',
      workspaceId: 'ws_personal',
      action: 'saveAsset',
      entity: 'ASSET',
      entity_id: localAsset.asset_id,
      asset_id: localAsset.asset_id,
      data: { name: 'ThinkPad Local Pending Edit' },
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: 'PENDING'
    };

    const resPending = (await import('./conflictResolution')).ConflictResolutionEngine.resolveAssetConflict(
      localAsset,
      newerRemote,
      [pendingQueueItem],
      new Set()
    );

    if (resPending.action !== 'KEEP_LOCAL') {
      throw new Error('Asertasi Gagal: Pending local mutation tertimpa oleh remote pull!');
    }
    logs.push('✓ Pending Mutation Safeguard terverifikasi: perubahan lokal offline terlindungi.');
  });

  // ---------------------------------------------------------
  // TEST E: Sync Failure Engineering Contracts (Phase 2D)
  // ---------------------------------------------------------
  await runSuite('test_e_failure_engineering', 'TEST E — Sync Failure Engineering & Backoff Contracts (Phase 2D)', async (logs) => {
    logs.push('Memverifikasi kontrak kegagalan sinkronisasi...');
    
    // Immutable mutation_id check
    const qItem = await dbManager.addToSyncQueue('saveAsset', { asset_id: 'test_mut_id', name: 'Test Mutation' });
    const originalMutId = qItem.mutation_id;
    if (!originalMutId || !originalMutId.startsWith('MUT-')) {
      throw new Error('Asertasi Gagal: Format mutation_id tidak memenuhi kontrak kanonikal!');
    }
    logs.push(`✓ Format mutation_id valid: ${originalMutId}`);

    // Exponential backoff check
    const delays = [1, 2, 3, 4, 5].map(attempt => dbManager.calculateBackoffDelaySeconds(attempt));
    const expected = [5, 15, 60, 120, 300];
    if (JSON.stringify(delays) !== JSON.stringify(expected)) {
      throw new Error(`Asertasi Gagal: Jadwal exponential backoff salah: ${JSON.stringify(delays)} vs ${JSON.stringify(expected)}`);
    }
    logs.push(`✓ Exponential backoff schedule terverifikasi: ${expected.join('s, ')}s`);

    // Error classification check
    const nonRetry = dbManager.classifySyncError(401, 'session_expired');
    const retryable = dbManager.classifySyncError(503, 'service_unavailable');
    if (nonRetry.isRetryable !== false || retryable.isRetryable !== true) {
      throw new Error('Asertasi Gagal: Error classification matrix tidak akurat!');
    }
    logs.push('✓ Error classification matrix terverifikasi (401 non-retryable, 503 retryable).');

    // Clean up
    await dbManager.removeSyncQueueItem(qItem.id);
    logs.push('✓ Pembersihan queue uji selesai.');
  });

  return results;
}
