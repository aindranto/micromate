export type AssetCategory = 'device' | 'vehicle' | 'sim_card' | 'home' | 'other' | string;

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

export type ReminderType = 'maintenance' | 'warranty' | 'vehicle' | 'documents' | 'payment' | 'sim_expiry' | 'custom';

export type ReminderStatus = 'pending' | 'completed' | 'dismissed';

export type ReminderDerivedState = 'upcoming' | 'due_today' | 'overdue' | 'completed' | 'dismissed';

export type ReminderRepeatRule = 
  | 'once' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'semi_annually' 
  | 'annually' 
  | 'custom_days'
  | 'custom_km';

export type RepeatRule = ReminderRepeatRule;

export type DocumentType = 
  | 'invoice' 
  | 'warranty'
  | 'warranty_card' 
  | 'purchase_receipt' 
  | 'stnk' 
  | 'bpkb' 
  | 'registration'
  | 'insurance' 
  | 'service_receipt' 
  | 'manual' 
  | 'condition_photo' 
  | 'photo'
  | 'certificate' 
  | 'other';

export type DocumentSyncStatus = 
  | 'LOCAL_ONLY' 
  | 'QUEUED' 
  | 'UPLOADING' 
  | 'UNKNOWN'
  | 'SYNCED' 
  | 'FAILED_RETRYABLE' 
  | 'FAILED_PERMANENT';

export type UploadManifestStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'UNKNOWN'
  | 'COMPLETED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_PERMANENT';

export interface UploadManifest {
  upload_manifest_id: string;
  document_id: string;
  asset_id: string;
  mutation_id: string;
  idempotency_key: string;
  file_fingerprint: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: UploadManifestStatus;
  drive_file_id?: string;
  drive_url?: string;
  thumbnail_url?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  last_attempt_at?: string;
  attempt_count: number;
  last_error?: string;
}

export interface Document {
  document_id: string;
  asset_id: string;
  document_type: DocumentType;
  title: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  sync_status: DocumentSyncStatus;
  drive_file_id?: string;
  drive_url?: string;
  thumbnail_url?: string;
  file_fingerprint?: string;
  local_file_ref?: string; // Reference to local Blob or cached storage key
  notes?: string;
  tags?: string[];
  last_error?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

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
  warranty_type?: 'official' | 'distributor' | 'store' | 'extended' | string;
  warranty_number?: string;
  notes?: string;
}

export interface Reminder {
  reminder_id: string;
  asset_id?: string;
  asset_name?: string;
  type: ReminderType;
  title: string;
  due_date: string; // Canonical active due date (YYYY-MM-DD)
  repeat_rule: ReminderRepeatRule;
  status: ReminderStatus; // Canonical stored status: 'pending' | 'completed' | 'dismissed'
  last_completed_at?: string;
  next_due_at?: string; // Optional compatibility helper, canonical is due_date
  notes?: string;
  custom_interval_days?: number;
  custom_interval_km?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
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
  source_type?: 'MANUAL' | 'MAINTENANCE' | 'PURCHASE' | 'TAX' | 'ACCESSORY';
  source_id?: string; // e.g. maintenance_id or purchase receipt
}

export type AssetHistoryAction = 
  | 'CREATED'
  | 'USER_CHANGED'
  | 'STATUS_CHANGED'
  | 'MAINTENANCE_RECORDED'
  | 'ODOMETER_CORRECTED'
  | 'METADATA_CHANGED'
  | 'DELETED'
  | 'RESTORED';

export interface AssetHistoryEvent {
  event_id: string;
  asset_id: string;
  asset_code?: string;
  timestamp: string;
  action: AssetHistoryAction;
  field?: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface MaintenanceItem {
  item_id?: string;
  name: string;
  cost: number;
  category?: 'part' | 'labor' | 'oil' | 'fee' | 'other';
}

export interface MaintenanceRecord {
  maintenance_id: string;
  asset_id: string;
  type: MaintenanceType;
  date: string; // Format: YYYY-MM-DD or ISO String
  title?: string;
  description?: string;
  mileage?: number; // Odometer reading at service time
  subtotal?: number;
  tax?: number;
  discount?: number;
  cost: number; // Total Cost (subtotal + tax - discount)
  provider?: string; // Workshop / Bengkel / Service Center
  technician_name?: string;
  notes?: string;
  items?: MaintenanceItem[];
  expense_id?: string; // Deterministic linkage to Expense
  next_date?: string;
  next_mileage?: number;
  created_at: string;
  updated_at?: string;
  deleted?: boolean;
}

export interface Asset {
  asset_id: string;
  asset_code?: string;
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
  location?: string; // Lokasi penempatan aset saat ini
  status: AssetStatus;
  notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
  is_demo?: boolean;
  data_origin?: 'demo' | 'local' | 'synced' | 'imported';
  assigned_user?: string; // Siapa yang menggunakan / Penanggung jawab aset
  history?: AssetHistoryEvent[]; // Riwayat kepemilikan / lifecycle aset

  // Joined/embedded details
  vehicle_details?: VehicleDetails;
  device_details?: DeviceDetails;
  sim_details?: SIMCardDetails;
  warranty?: Warranty;
  maintenance_records?: MaintenanceRecord[];
  reminders?: Reminder[];
  documents?: (Document | AssetDocument)[];
  expenses?: Expense[];
}

export type ConnectionStatus = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'OTP_SENT' 
  | 'VERIFYING' 
  | 'VERIFIED' 
  | 'ERROR';

export type SyncStatus = 
  | 'unconfigured' 
  | 'unverified' 
  | 'partial' 
  | 'pending' 
  | 'syncing' 
  | 'synced' 
  | 'error' 
  | 'offline';

export type SyncQueueItemStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'FAILED_RETRYABLE' 
  | 'FAILED_PERMANENT' 
  | 'COMPLETED';

export type SyncErrorType = 'RETRYABLE' | 'NON_RETRYABLE';

export type SyncEntity = 
  | 'ASSET' 
  | 'SERVICE' 
  | 'MAINTENANCE'
  | 'REMINDER' 
  | 'DOCUMENT' 
  | 'EXPENSE' 
  | 'SIM' 
  | 'HISTORY'
  | 'SESSION'
  | 'GENERAL';

export interface ServiceHealth {
  appsScript: boolean;
  googleSheets: boolean;
  googleDrive: boolean;
  emailOwnership?: boolean;
  maskedEmail?: string;
  verifiedAt?: string;
  connectionStatus?: ConnectionStatus;
  lastChecked?: string;
  errorMessage?: string;
}

export interface SyncQueueItem {
  id: string;
  mutation_id: string; // Immutable UUID/timestamp, never regenerated on retry
  action: string;
  entity: SyncEntity;
  entity_id: string;
  asset_id: string;
  workspaceId: string;
  data: any;
  created_at: string;
  timestamp?: string; // Backward compatibility alias
  retry_count: number;
  retryCount?: number; // Backward compatibility alias
  last_attempt_at?: string;
  lastAttemptAt?: string; // Backward compatibility alias
  next_retry_at?: string;
  nextRetryAt?: string; // Backward compatibility alias
  last_error?: string;
  lastError?: string; // Backward compatibility alias
  error_type?: SyncErrorType;
  status: SyncQueueItemStatus;
  processing_started_at?: string; // Lease / timeout tracking
}

export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface DeviceSession {
  session_hash: string;
  device_id: string;
  device_name?: string;
  created_at: string;
  expires_at: string;
  last_used_at: string;
  status: SessionStatus;
  paired_email: string;
  is_current?: boolean;
}

// --- Phase 3C-5: Cross-Domain Transaction Ledger & Reconciliation Types ---

export type TransactionStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'PARTIAL' 
  | 'FAILED_RETRYABLE' 
  | 'FAILED_PERMANENT';

export type TransactionStep = 
  | 'MAINTENANCE' 
  | 'EXPENSE' 
  | 'HISTORY' 
  | 'REMINDER' 
  | 'VEHICLE_PROJECTION' 
  | 'SYNC_MUTATION';

export interface CrossDomainTransaction {
  transaction_id: string;
  mutation_id: string;
  entity_type: SyncEntity;
  entity_id: string;
  asset_id: string;
  action: string;
  payload: any;
  status: TransactionStatus;
  completed_steps: TransactionStep[];
  failed_steps: Array<{ step: TransactionStep; error: string; timestamp: string }>;
  created_at: string;
  updated_at: string;
  last_reconciled_at?: string;
  reconciliation_count: number;
}

// --- Phase 3E-1: Asset Cost Intelligence & TCO Read-Model Types ---

export type TCOTimeRange = '3M' | '6M' | '1Y' | 'ALL';

export type TCOCostCategory = 'MAINTENANCE' | 'TAX_REGISTRATION' | 'FUEL' | 'PURCHASE' | 'ACCESSORY' | 'OTHER';

export interface TCOFactRecord {
  fact_id: string;
  asset_id: string;
  source_type: 'MAINTENANCE' | 'EXPENSE' | 'REMINDER' | 'PURCHASE';
  source_id: string;
  category: TCOCostCategory;
  title: string;
  amount: number; // Integer minor unit (Rupiah integer)
  date: string; // YYYY-MM-DD or ISO String
  mileage?: number;
  valid: boolean;
  exclusion_reason?: 'MISSING_AMOUNT' | 'INVALID_AMOUNT_NAN' | 'NEGATIVE_AMOUNT' | 'INVALID_DATE';
}

export interface TCOCategoryBreakdown {
  category: TCOCostCategory;
  label: string;
  total_amount: number; // Integer minor unit
  percentage: number;  // 0-100 rounded integer
  record_count: number;
}

export interface TCOMonthlyPoint {
  year_month: string; // YYYY-MM
  label: string;      // e.g. "Jan 2026"
  maintenance_amount: number;
  tax_amount: number;
  fuel_amount: number;
  other_amount: number;
  total_amount: number;
}

export interface TCOSummaryMetrics {
  asset_id: string;
  time_range: TCOTimeRange;
  total_cost: number;                   // Integer minor unit
  purchase_price: number | null;        // Integer minor unit or null if unknown
  operational_cost: number;             // Total cost excluding purchase price
  monthly_average_cost: number;         // Integer minor unit
  cost_per_km: number | null;           // Cost per KM (null if mileage <= 0 or invalid)
  current_month_cost: number;           // Integer minor unit
  previous_month_cost: number;          // Integer minor unit
  cost_trend_percentage: number | null; // % change vs prev month (null if prev month 0)
  active_period_months: number;         // Minimum 1 month
  included_facts_count: number;
  excluded_facts_count: number;
  depreciation_status: 'NOT_AVAILABLE'; // Explicitly NOT_AVAILABLE for 3E-1
}

export interface TCOAnalyticsReport {
  asset_id: string;
  asset_name: string;
  generated_at: string;
  time_range: TCOTimeRange;
  summary: TCOSummaryMetrics;
  category_breakdown: TCOCategoryBreakdown[];
  monthly_trend: TCOMonthlyPoint[];
  facts: TCOFactRecord[];
}


// Phase 3F-0: Asset Attention & Priority Intelligence Types

export type SignalSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SignalSourceDomain = 'ASSET' | 'MAINTENANCE' | 'REMINDER' | 'DOCUMENT' | 'TCO';

export interface SignalEvidence {
  source_domain: SignalSourceDomain;
  source_record_id: string;
  source_field: string;
  observed_value: string | number;
  evaluation_date: string;
  threshold_rule: string;
}

export interface CanonicalSignal {
  signal_id: string;
  signal_type: 'DOCUMENT_EXPIRED' | 'DOCUMENT_EXPIRING_SOON' | 'MAINTENANCE_OVERDUE' | 'COST_TREND_INCREASE' | 'DATA_INCOMPLETE' | string;
  asset_id: string;
  severity: SignalSeverity;
  evidence: SignalEvidence[];
  action_code: string;
  priority_order: number;
}

export type AttentionLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface PriorityResolution {
  asset_id: string;
  attention_level: AttentionLevel;
  attention_score: number; // 0 - 100
  primary_signal: CanonicalSignal | null;
  supporting_signals: CanonicalSignal[];
  all_signals: CanonicalSignal[];
  explanation: string[];
}

export interface ResolvedAction {
  action_code: string;
  label: string;
  description: string;
  available: boolean;
  context_data?: Record<string, unknown>;
}

// Phase 3F-5A: Attention Intelligence Presentation ViewModel Interfaces

export type SeverityTone = 'critical' | 'high' | 'medium' | 'low' | 'neutral';

export type AssetDataState = 'SUFFICIENT' | 'INSUFFICIENT' | 'EMPTY';

export interface EvidenceViewModel {
  domain_label: string;
  record_id: string;
  field_label: string;
  observed_value: string;
  rule_explanation: string;
}

export interface SignalItemViewModel {
  signal_id: string;
  type_label: string;
  severity: SignalSeverity;
  severity_tone: SeverityTone;
  title: string;
  description: string;
  evidence_list: EvidenceViewModel[];
  primary_action: ResolvedAction;
}

export interface AssetAttentionViewModel {
  asset_id: string;
  asset_name: string;
  asset_category: string;
  attention_level: AttentionLevel;
  header_badge_text: string;
  severity_tone: SeverityTone;
  summary_text: string;
  attention_score_display: string | null; // Secondary metric only
  primary_signal: SignalItemViewModel | null;
  supporting_signals: SignalItemViewModel[];
  all_signals: SignalItemViewModel[];
  total_signals_count: number;
  has_actionable_signals: boolean;
  data_state: AssetDataState;
}

export interface FleetAttentionDashboardViewModel {
  generated_at_formatted: string;
  total_assets_evaluated: number;
  critical_attention_count: number;
  high_attention_count: number;
  medium_attention_count: number;
  normal_attention_count: number;
  insufficient_data_count: number;
  asset_views: AssetAttentionViewModel[];
  top_priority_assets: AssetAttentionViewModel[];
}

// Phase 4-1: Evidence-Based Operational Closure Contracts

export type WorkflowType = 
  | 'MAINTENANCE_OVERDUE_CLOSURE'
  | 'DOCUMENT_RENEWAL_CLOSURE'
  | 'COST_TREND_REVIEW';

export type WorkflowState =
  | 'DRAFT'
  | 'READY'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'RECONCILIATION_REQUIRED'
  | 'RESOLVED'
  | 'FAILED'
  | 'CANCELLED';

export interface WorkflowFailure {
  failed_step: string;
  error_message: string;
  failed_at: string; // ISO 8601 Timestamp
  attempt_count: number;
}

export interface WorkflowReconciliation {
  reconciliation_type: 'EXPLICIT_CONFIRMATION' | 'MANUAL_OVERRIDE';
  reconciled_by_user_id?: string;
  reconciled_by?: string;
  notes?: string;
  resolution_notes?: string;
  reconciled_at?: string; // ISO 8601 Timestamp
}

export interface WorkflowCase {
  readonly workflow_case_id: string;
  readonly workflow_type: WorkflowType;
  workflow_state: WorkflowState;

  readonly asset_id: string;

  readonly trigger_signal_id?: string;
  readonly source_record_id?: string;
  readonly action_code: string; // Corresponds to Phase 3F action codes (e.g. 'SCHEDULE_MAINTENANCE')

  readonly created_at: string;
  updated_at: string;

  context_data?: {
    linked_maintenance_id?: string;
    linked_document_id?: string;
    linked_reminder_id?: string;
    user_acknowledgement_note?: string;
    partial_failure_logs?: string[];
  };

  failure?: WorkflowFailure;
  reconciliation?: WorkflowReconciliation;
}

export type WorkflowEvent =
  | 'PREPARE'
  | 'EXECUTE'
  | 'COMPLETE'
  | 'PARTIAL_FAILURE'
  | 'FAIL'
  | 'RECONCILE'
  | 'RESOLVE'
  | 'RETRY'
  | 'CANCEL';

export interface WorkflowTransitionPayload {
  failure?: WorkflowFailure;
  reconciliation?: WorkflowReconciliation;
  context_data?: Partial<NonNullable<WorkflowCase['context_data']>>;
  timestamp?: string;
}

export type WorkflowTransitionResult =
  | {
      accepted: true;
      previous_state: WorkflowState;
      next_state: WorkflowState;
      workflow_case: WorkflowCase;
    }
  | {
      accepted: false;
      previous_state: WorkflowState;
      attempted_event: WorkflowEvent;
      reason: string;
    };

// Phase 4-3A: Mutation Outcome & Coordinated Mutation Contracts

export type MutationStatus = 'NOT_ATTEMPTED' | 'SUCCEEDED' | 'FAILED';

export interface MutationOutcome {
  operation_id: string; // Deterministic mutation_id (e.g. WC-001:MAINTENANCE_CREATE)
  status: MutationStatus;
  entity_type: string; // 'MaintenanceRecord' | 'Reminder' | 'Document' | 'Expense'
  entity_id?: string;
  error_message?: string;
  completed_at?: string; // ISO 8601 Timestamp
}

export interface CoordinatedMutationResult {
  workflow_case_id: string;
  primary_mutation: MutationOutcome;
  secondary_mutation: MutationOutcome;
  overall_status: 'SUCCESS' | 'PARTIAL_FAILURE' | 'FAILURE';
  reconciliation_required: boolean;
  updated_workflow_case: WorkflowCase;
}

// Phase 4-4A: Action Execution Gateway Contracts

export type GatewayExecutionStatus =
  | 'IDLE'
  | 'PREPARING'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'PARTIAL_FAILURE'
  | 'FAILURE'
  | 'RECONCILIATION_REQUIRED'
  | 'CANCELLED';

export interface WorkflowGatewayRequest {
  action_code: string;
  asset_id: string;
  trigger_signal_id?: string;
  source_record_id?: string;
  workflow_case_id?: string; // Set when retrying/reconciling an existing case
  payload?: {
    maintenanceInput?: any;
    documentInput?: any;
    notes?: string;
    [key: string]: any;
  };
}

export interface WorkflowGatewayResponse {
  success: boolean;
  gateway_status: GatewayExecutionStatus;
  workflow_case: WorkflowCase;
  mutation_result?: CoordinatedMutationResult;
  error_message?: string;
  available_actions: ('EXECUTE' | 'RETRY' | 'RECONCILE' | 'CANCEL')[];
}

// Phase 5-1: Document Renewal Contracts

export interface DocumentRenewalEvidence {
  asset_id: string;
  document_type: DocumentType;
  title: string;
  new_expiry_date: string;
  issue_date?: string;
  document_number?: string;
  issuer_name?: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  local_file_ref?: string;
  file_fingerprint?: string;
  renewal_cost?: number;
  notes?: string;
  previous_document_id?: string;
}

export interface DocumentRenewalMutationContext {
  operation_id: string;
  workflow_case_id: string;
  asset: Asset;
  evidence: DocumentRenewalEvidence;
  source_reminder?: Reminder;
  previous_document?: Document;
}

export interface DocumentRenewalCoordinatedResult {
  primary_document: MutationOutcome;
  secondary_archival: MutationOutcome;
  secondary_reminder_reconciliation: MutationOutcome;
  optional_expense?: MutationOutcome;
  overall_status: 'SUCCESS' | 'PARTIAL_FAILURE' | 'FAILURE';
  reconciliation_required: boolean;
  updated_workflow_case: WorkflowCase;
}

// Phase 5-3A: Immutable Audit Acknowledgement Record
export interface AcknowledgementRecord {
  acknowledgement_id: string;
  signal_id: string;
  asset_id: string;
  action_code: string;
  source_record_id?: string;
  acknowledged_by: string;
  acknowledged_at: string; // ISO 8601 Timestamp
  note?: string;
  metadata?: Record<string, unknown>;
}

// Phase 6-0 & Phase 6-1A: Outreach & Notification Intelligence Contracts
export type NotificationChannel = 'PUSH' | 'EMAIL' | 'CALENDAR';

export type NotificationStatus = 
  | 'QUEUED' 
  | 'DISPATCHED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'OBSOLETE' 
  | 'READ';

export interface NotificationRecord {
  readonly notification_id: string;
  readonly signal_id: string; // References triggering CanonicalSignal
  readonly signal_snapshot: CanonicalSignal; // Snapshot at time of queueing (I-02)
  readonly action_code: string; // Triggering action code
  readonly channel: NotificationChannel;
  readonly asset_id: string;
  readonly recipient_identity: string; // User email, push token, etc.
  
  status: NotificationStatus;
  
  readonly created_at: string;
  readonly scheduled_at: string;
  delivered_at?: string;
  obsolete_at?: string;
  cancelled_at?: string;
  
  readonly deduplication_key: string; // Hash or key used to prevent redundant deliveries
  attempt_count: number;
  failure_reason?: string;
  
  readonly deep_link_action?: {
    readonly action_code: string;
    readonly payload: Record<string, unknown>;
  };
}

export interface UserNotificationPreference {
  readonly user_id: string;
  channels: {
    push_enabled: boolean;
    email_enabled: boolean;
    calendar_enabled: boolean;
  };
  severity_matrix: Record<SignalSeverity, NotificationChannel[]>;
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:MM
    end_time: string; // HH:MM
    timezone: string;
  };
  digest_mode: {
    enabled: boolean;
    frequency: 'DAILY' | 'WEEKLY';
    preferred_day?: number; // 1-7
  };
}

// Phase 6-1C: Delivery Adapter & Subscription Lifecycle Contracts
export type DeliveryResponseStatus = 'DELIVERED' | 'FAILED' | 'REJECTED' | 'UNAVAILABLE';

export interface DeliveryRequest {
  readonly notification_id: string;
  readonly recipient_identity: string;
  readonly channel: NotificationChannel;
  readonly title: string;
  readonly body: string;
  readonly payload?: Record<string, unknown>;
}

export interface DeliveryResult {
  readonly status: DeliveryResponseStatus;
  readonly delivered_at?: string;
  readonly failure_reason?: string;
  readonly provider_reference_id?: string;
}

export interface DeliveryAttempt {
  readonly attempt_id: string;
  readonly notification_id: string;
  readonly attempt_count: number;
  readonly status: DeliveryResponseStatus;
  readonly timestamp: string;
  readonly error_message?: string;
}

export interface PushSubscriptionRecord {
  readonly subscription_id: string;
  readonly user_id: string;
  readonly device_name: string; // e.g. "Desktop Chrome", "Mobile Chrome"
  readonly endpoint: string; // Target push endpoint
  readonly p256dh: string; // Client public key
  readonly auth: string; // Client auth secret
  readonly created_at: string;
  last_seen_at: string;
  is_active: boolean;
}

// Phase 6-2A: Client Notification Contracts
export type ClientNotificationState = 'UNREAD' | 'READ' | 'OPENED' | 'OBSOLETE' | 'CANCELLED';

export interface ClientNotification {
  readonly notification_id: string;
  readonly user_id: string;
  readonly notification_record_id: string; // References NotificationRecord
  readonly signal_snapshot: CanonicalSignal;
  readonly title: string;
  readonly body: string;
  readonly severity: SignalSeverity;
  readonly action_binding: {
    readonly action_code: string;
    readonly source_record_id?: string;
    readonly deep_link: string;
  };
  readonly created_at: string;
  client_state: ClientNotificationState;
  state_updated_at: string;
  cancel_reason?: string;
  cancel_actor?: string;
}

export interface NotificationChannelPreference {
  inApp: boolean;
  browserPush: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  globalEnabled: boolean;
  browserPermissionState: 'default' | 'granted' | 'denied' | 'unsupported';
  categories: {
    DOCUMENT_EXPIRING_SOON: NotificationChannelPreference;
    DOCUMENT_EXPIRED: NotificationChannelPreference;
    MAINTENANCE_OVERDUE: NotificationChannelPreference;
    COST_TREND_INCREASE: NotificationChannelPreference;
  };
}





