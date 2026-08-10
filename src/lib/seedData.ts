import { Asset } from '../types';

export const INITIAL_WORKSPACE_ID = 'workspace_default_01';

export const SEED_ASSETS: Asset[] = [
  {
    asset_id: 'ast_macbook_m2',
    workspace_id: INITIAL_WORKSPACE_ID,
    category: 'device',
    subcategory: 'Laptop',
    name: 'MacBook Air M2 13-inch',
    brand: 'Apple',
    model: 'MacBookAir14,2 (MLXW3ID/A)',
    serial_number: 'C02GX902Q167',
    purchase_date: '2025-09-15',
    purchase_price: 18500000,
    purchase_location: 'iBox Grand Indonesia',
    status: 'active',
    notes: 'Unit utama kerja harian. Midnight color 8GB/256GB.',
    photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    created_at: '2025-09-15T10:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    is_demo: true,
    data_origin: 'demo',
    device_details: {
      device_id: 'dev_macbook_m2',
      asset_id: 'ast_macbook_m2',
      model_number: 'A2681',
      product_code: 'MLXW3ID/A',
      accessories: ['MagSafe 3 Cable', '35W Dual USB-C Adapter', 'Tomtoc Sleeve']
    },
    warranty: {
      warranty_id: 'war_macbook_m2',
      asset_id: 'ast_macbook_m2',
      start_date: '2025-09-15',
      end_date: '2026-09-15', // Expiring in ~1 month
      provider: 'AppleCare / iBox Indonesia',
      warranty_type: 'official',
      warranty_number: 'AP-ID-992019',
      notes: 'Garansi resmi iBox Indonesia 1 tahun.'
    },
    maintenance_records: [
      {
        maintenance_id: 'mnt_macbook_01',
        asset_id: 'ast_macbook_m2',
        type: 'routine_service',
        date: '2026-03-10',
        cost: 250000,
        provider: 'iBox Service Center',
        notes: 'Pembersihan fan internal & penggantian pasta termal.',
        created_at: '2026-03-10T14:30:00Z'
      }
    ],
    reminders: [
      {
        reminder_id: 'rem_macbook_war',
        asset_id: 'ast_macbook_m2',
        asset_name: 'MacBook Air M2 13-inch',
        type: 'warranty',
        title: 'Masa Garansi MacBook Air M2 Berakhir',
        due_date: '2026-09-15',
        repeat_rule: 'none',
        status: 'upcoming',
        created_at: '2026-08-01T08:00:00Z',
        updated_at: '2026-08-01T08:00:00Z'
      }
    ],
    documents: [
      {
        document_id: 'doc_macbook_inv',
        asset_id: 'ast_macbook_m2',
        type: 'invoice',
        name: 'Invoice_iBox_MacBook_M2.pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        created_at: '2025-09-15T10:15:00Z'
      },
      {
        document_id: 'doc_macbook_war',
        asset_id: 'ast_macbook_m2',
        type: 'warranty_card',
        name: 'Kartu_Garansi_iBox.pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        created_at: '2025-09-15T10:15:00Z'
      }
    ],
    expenses: [
      { expense_id: 'exp_mb_01', asset_id: 'ast_macbook_m2', type: 'purchase', amount: 18500000, date: '2025-09-15', description: 'Pembelian laptop iBox' },
      { expense_id: 'exp_mb_02', asset_id: 'ast_macbook_m2', type: 'accessories', amount: 450000, date: '2025-09-18', description: 'Tomtoc Protective Sleeve' },
      { expense_id: 'exp_mb_03', asset_id: 'ast_macbook_m2', type: 'maintenance', amount: 250000, date: '2026-03-10', description: 'Pembersihan internal' }
    ]
  },
  {
    asset_id: 'ast_vario_160',
    workspace_id: INITIAL_WORKSPACE_ID,
    category: 'vehicle',
    subcategory: 'Motorcycle',
    name: 'Honda Vario 160 ABS',
    brand: 'Honda',
    model: 'Vario 160 Matte Black',
    serial_number: 'MH1KF1118PK09128',
    purchase_date: '2024-05-20',
    purchase_price: 29800000,
    purchase_location: 'AHASS Daya Motor Jakarta',
    status: 'active',
    notes: 'Motor harian komuter kantor. Bensin Pertamax.',
    photo_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    created_at: '2024-05-20T08:00:00Z',
    updated_at: '2026-08-05T09:00:00Z',
    is_demo: true,
    data_origin: 'demo',
    vehicle_details: {
      vehicle_id: 'veh_vario_160',
      asset_id: 'ast_vario_160',
      vehicle_type: 'motorcycle',
      license_plate: 'B 4982 SGF',
      manufacture_year: 2024,
      current_mileage: 12450,
      last_service_mileage: 10000,
      next_service_mileage: 13000, // Approaching service!
      last_oil_change_date: '2026-05-10',
      last_oil_change_mileage: 10000,
      next_oil_change_mileage: 12500, // Overdue or immediate!
      annual_tax_date: '2026-08-25', // Due in ~2 weeks!
      five_year_registration_date: '2029-05-20'
    },
    warranty: {
      warranty_id: 'war_vario_160',
      asset_id: 'ast_vario_160',
      start_date: '2024-05-20',
      end_date: '2029-05-20', // Garansi Rangka eSAF 5 tahun
      provider: 'AHASS Astra Honda',
      warranty_type: 'official',
      warranty_number: 'AHM-ESAF-2024-88',
      notes: 'Garansi Rangka 5 Tahun tanpa batasan jarak tempuh.'
    },
    maintenance_records: [
      {
        maintenance_id: 'mnt_vario_01',
        asset_id: 'ast_vario_160',
        type: 'oil_change',
        date: '2026-05-10',
        mileage: 10000,
        cost: 125000,
        provider: 'AHASS Daya Motor',
        notes: 'Ganti Oli MPX2 + Oli Gardan.',
        next_date: '2026-08-10',
        next_mileage: 125000,
        created_at: '2026-05-10T11:00:00Z'
      },
      {
        maintenance_id: 'mnt_vario_02',
        asset_id: 'ast_vario_160',
        type: 'routine_service',
        date: '2026-01-15',
        mileage: 8000,
        cost: 350000,
        provider: 'AHASS Daya Motor',
        notes: 'Servis CVT, bersihkan injector, ganti Busi NGK.',
        created_at: '2026-01-15T15:00:00Z'
      }
    ],
    reminders: [
      {
        reminder_id: 'rem_vario_tax',
        asset_id: 'ast_vario_160',
        asset_name: 'Honda Vario 160 ABS',
        type: 'vehicle',
        title: 'Jatuh Tempo Pajak STNK Tahunan (B 4982 SGF)',
        due_date: '2026-08-25',
        repeat_rule: 'annually',
        status: 'upcoming',
        created_at: '2026-08-01T08:00:00Z',
        updated_at: '2026-08-01T08:00:00Z'
      },
      {
        reminder_id: 'rem_vario_oil',
        asset_id: 'ast_vario_160',
        asset_name: 'Honda Vario 160 ABS',
        type: 'maintenance',
        title: 'Ganti Oli Mesin Vario 160 (Target 12.500 km)',
        due_date: '2026-08-12',
        repeat_rule: 'custom_km',
        status: 'overdue',
        created_at: '2026-08-01T08:00:00Z',
        updated_at: '2026-08-01T08:00:00Z'
      }
    ],
    documents: [
      {
        document_id: 'doc_vario_stnk',
        asset_id: 'ast_vario_160',
        type: 'stnk',
        name: 'STNK_Vario_160_B4982SGF.pdf',
        file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        created_at: '2024-05-20T08:30:00Z'
      }
    ],
    expenses: [
      { expense_id: 'exp_vr_01', asset_id: 'ast_vario_160', type: 'purchase', amount: 29800000, date: '2024-05-20', description: 'Pembelian Honda Vario 160 OTR' },
      { expense_id: 'exp_vr_02', asset_id: 'ast_vario_160', type: 'maintenance', amount: 125000, date: '2026-05-10', description: 'Oli Mesin MPX2 & Gardan' },
      { expense_id: 'exp_vr_03', asset_id: 'ast_vario_160', type: 'maintenance', amount: 350000, date: '2026-01-15', description: 'Servis CVT & Busi' },
      { expense_id: 'exp_vr_04', asset_id: 'ast_vario_160', type: 'accessories', amount: 320000, date: '2024-06-02', description: 'Floor Mat & Hand Guard' }
    ]
  },
  {
    asset_id: 'ast_lg_ac_1pk',
    workspace_id: INITIAL_WORKSPACE_ID,
    category: 'home',
    subcategory: 'Air Conditioner',
    name: 'LG Dual Inverter AC 1 PK',
    brand: 'LG Electronics',
    model: 'T10EV4 Dual Cool',
    serial_number: 'LGAC202390112',
    purchase_date: '2024-02-10',
    purchase_price: 4600000,
    purchase_location: 'Electronic City Mal Kelapa Gading',
    status: 'active',
    notes: 'Kamar Tidur Utama. Menggunakan freon R32.',
    photo_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    created_at: '2024-02-10T12:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
    is_demo: true,
    data_origin: 'demo',
    warranty: {
      warranty_id: 'war_lg_ac',
      asset_id: 'ast_lg_ac_1pk',
      start_date: '2024-02-10',
      end_date: '2034-02-10', // 10 tahun kompresor
      provider: 'LG Service Center Indonesia',
      warranty_type: 'official',
      warranty_number: 'LG-INV-88219',
      notes: 'Garansi Kompresor Inverter 10 Tahun, Sparepart 1 Tahun.'
    },
    maintenance_records: [
      {
        maintenance_id: 'mnt_lg_01',
        asset_id: 'ast_lg_ac_1pk',
        type: 'ac',
        date: '2026-05-02',
        cost: 100000,
        provider: 'Sejuk Jaya Teknik',
        notes: 'Cuci rutin AC indoor & outdoor.',
        next_date: '2026-08-20',
        created_at: '2026-05-02T16:00:00Z'
      }
    ],
    reminders: [
      {
        reminder_id: 'rem_lg_ac_wash',
        asset_id: 'ast_lg_ac_1pk',
        asset_name: 'LG Dual Inverter AC 1 PK',
        type: 'maintenance',
        title: 'Jadwal Cuci Rutin AC Kamar Utama (3 Bulanan)',
        due_date: '2026-08-20',
        repeat_rule: 'quarterly',
        status: 'upcoming',
        created_at: '2026-08-01T08:00:00Z',
        updated_at: '2026-08-01T08:00:00Z'
      }
    ],
    documents: [],
    expenses: [
      { expense_id: 'exp_ac_01', asset_id: 'ast_lg_ac_1pk', type: 'purchase', amount: 4600000, date: '2024-02-10', description: 'Pembelian + Pasang Unit AC' },
      { expense_id: 'exp_ac_02', asset_id: 'ast_lg_ac_1pk', type: 'maintenance', amount: 100000, date: '2026-05-02', description: 'Cuci AC Rutin' }
    ]
  },
  {
    asset_id: 'ast_sony_a7iv',
    workspace_id: INITIAL_WORKSPACE_ID,
    category: 'camera',
    subcategory: 'Mirrorless Camera',
    name: 'Sony Alpha 7 IV (ILCE-7M4)',
    brand: 'Sony',
    model: 'A7IV Body Only',
    serial_number: '3049182',
    purchase_date: '2024-11-05',
    purchase_price: 33999000,
    purchase_location: 'Doss Camera Jakarta',
    status: 'active',
    notes: 'Kamera liputan video & fotografi profesional.',
    photo_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    created_at: '2024-11-05T14:00:00Z',
    updated_at: '2026-07-20T10:00:00Z',
    is_demo: true,
    data_origin: 'demo',
    device_details: {
      device_id: 'dev_sony_a7iv',
      asset_id: 'ast_sony_a7iv',
      model_number: 'ILCE-7M4',
      accessories: ['Original NP-FZ100 Battery', 'Sony Strap', 'SmallRig Cage']
    },
    warranty: {
      warranty_id: 'war_sony_a7iv',
      asset_id: 'ast_sony_a7iv',
      start_date: '2024-11-05',
      end_date: '2026-11-05',
      provider: 'PT Sony Indonesia',
      warranty_type: 'official',
      warranty_number: 'SNY-ID-2024-1920',
      notes: 'Garansi Resmi Sony Indonesia 2 Tahun.'
    },
    maintenance_records: [
      {
        maintenance_id: 'mnt_sony_01',
        asset_id: 'ast_sony_a7iv',
        type: 'routine_service',
        date: '2026-02-18',
        cost: 200000,
        provider: 'Sony Center Plaza Indonesia',
        notes: 'Pembersihan sensor full-frame & kalibrasi AF.',
        created_at: '2026-02-18T12:00:00Z'
      }
    ],
    reminders: [],
    documents: [],
    expenses: [
      { expense_id: 'exp_sny_01', asset_id: 'ast_sony_a7iv', type: 'purchase', amount: 33999000, date: '2024-11-05', description: 'Pembelian kamera Sony A7IV' },
      { expense_id: 'exp_sny_02', asset_id: 'ast_sony_a7iv', type: 'accessories', amount: 1200000, date: '2024-11-10', description: 'SmallRig Camera Cage' },
      { expense_id: 'exp_sny_03', asset_id: 'ast_sony_a7iv', type: 'maintenance', amount: 200000, date: '2026-02-18', description: 'Sensor cleaning' }
    ]
  }
];
