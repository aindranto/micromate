export type AssetCategory = 'device' | 'vehicle' | 'home' | 'camera' | 'gaming' | 'other';

export type AssetStatus = 'active' | 'stored' | 'under_repair' | 'sold' | 'disposed';

export type VehicleType = 'car' | 'motorcycle';

export type MaintenanceType = 
  | 'routine_service' 
  | 'oil_change' 
  | 'tire' 
  | 'battery' 
  | 'brake' 
  | 'transmission' 
  | 'ac' 
  | 'repair' 
  | 'custom';

export type ReminderType = 'maintenance' | 'warranty' | 'vehicle' | 'documents' | 'payment' | 'custom';

export type ReminderStatus = 'upcoming' | 'overdue' | 'completed';

export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom_km';

export type DocumentType = 'invoice' | 'warranty_card' | 'purchase_receipt' | 'stnk' | 'insurance' | 'service_receipt' | 'manual' | 'other';

export type ExpenseType = 'purchase' | 'maintenance' | 'repair' | 'accessories' | 'other';

export interface Workspace {
  workspace_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived';
}

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
  next_oil_change_mileage?: number;
  annual_tax_date?: string; // STNK jatuh tempo
  five_year_registration_date?: string; // Plat 5 tahunan
}

export interface DeviceDetails {
  device_id: string;
  asset_id: string;
  imei?: string;
  product_code?: string;
  model_number?: string;
  accessories?: string[];
}

export interface Warranty {
  warranty_id: string;
  asset_id: string;
  start_date: string;
  end_date: string;
  provider: string;
  warranty_type?: 'official' | 'distributor' | 'store' | 'extended' | string;
  warranty_number?: string;
  notes?: string;
}

export interface MaintenanceRecord {
  maintenance_id: string;
  asset_id: string;
  type: MaintenanceType;
  date: string;
  mileage?: number;
  cost: number;
  provider?: string;
  notes?: string;
  next_date?: string;
  next_mileage?: number;
  created_at: string;
}

export interface Reminder {
  reminder_id: string;
  asset_id?: string;
  asset_name?: string;
  type: ReminderType;
  title: string;
  due_date: string;
  repeat_rule: RepeatRule;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
}

export interface AssetDocument {
  document_id: string;
  asset_id: string;
  type: DocumentType;
  name: string;
  file_url: string;
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

export interface Asset {
  asset_id: string;
  workspace_id: string;
  category: AssetCategory;
  subcategory?: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  purchase_location?: string;
  status: AssetStatus;
  notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
  is_demo?: boolean;
  data_origin?: 'demo' | 'local' | 'synced' | 'imported';

  // Joined/embedded details
  vehicle_details?: VehicleDetails;
  device_details?: DeviceDetails;
  warranty?: Warranty;
  maintenance_records?: MaintenanceRecord[];
  reminders?: Reminder[];
  documents?: AssetDocument[];
  expenses?: Expense[];
}

export type SyncStatus = 
  | 'unconfigured' 
  | 'unverified' 
  | 'partial' 
  | 'pending' 
  | 'syncing' 
  | 'synced' 
  | 'error' 
  | 'offline';

export interface ServiceHealth {
  appsScript: boolean;
  googleSheets: boolean;
  googleDrive: boolean;
  lastChecked?: string;
  errorMessage?: string;
}

export interface SyncQueueItem {
  id: string;
  action: string;
  workspaceId: string;
  data: any;
  timestamp: string;
}
