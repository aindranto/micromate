/**
 * MICROMATE PHASE 3D-R1: AUDIT & LOG SANITIZER UTILITY
 * 
 * Provides production-grade secret redaction, log auditing, and field sanitization.
 * Enforces zero leakage of session tokens, OAuth credentials, raw base64 payloads,
 * and authorization headers in logs or telemetry outputs.
 */

export interface SafeLogMetadata {
  mutation_id?: string;
  document_id?: string;
  asset_id?: string;
  status?: string;
  attempt_count?: number;
  timestamp?: string;
  error_classification?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  [key: string]: unknown;
}

export interface SanitizationResult {
  clean: boolean;
  sanitized: Record<string, unknown>;
  leakedKeys: string[];
}

const FORBIDDEN_SECRET_PATTERNS = [
  /token/i,
  /bearer/i,
  /authorization/i,
  /password/i,
  /secret/i,
  /credential/i,
  /base64/i,
  /private_key/i,
  /api_key/i,
];

const BASE64_DATA_REGEX = /^data:[\w/+-]+;base64,[A-Za-z0-9+/=]+/;

/**
 * Redacts sensitive fields from any log payload object.
 */
export function sanitizeLogObject(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};

  const cleanObj: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    // Check if key itself matches sensitive patterns
    const isSensitiveKey = FORBIDDEN_SECRET_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitiveKey) {
      cleanObj[key] = '[REDACTED]';
    } else if (typeof val === 'string') {
      if (BASE64_DATA_REGEX.test(val) || (val.length > 200 && /^[A-Za-z0-9+/=]+$/.test(val))) {
        cleanObj[key] = `[REDACTED_BASE64_CONTENT_${val.length}_BYTES]`;
      } else if (val.toLowerCase().includes('bearer ') || val.toLowerCase().includes('tok_')) {
        cleanObj[key] = '[REDACTED_TOKEN]';
      } else {
        cleanObj[key] = val;
      }
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      cleanObj[key] = sanitizeLogObject(val as Record<string, unknown>);
    } else {
      cleanObj[key] = val;
    }
  }

  return cleanObj;
}

/**
 * Audit inspects a log string or JSON object for forbidden secret patterns.
 * Returns true if clean (zero leaks), false if leaks detected.
 */
export function inspectLogForLeaks(logInput: string | Record<string, unknown>): SanitizationResult {
  const leakedKeys: string[] = [];
  const logStr = typeof logInput === 'string' ? logInput : JSON.stringify(logInput);

  // Check for raw token values
  if (/tok_[a-zA-Z0-9_-]{8,}/.test(logStr)) {
    leakedKeys.push('session_token');
  }

  // Check for Bearer headers
  if (/Bearer\s+[a-zA-Z0-9._-]+/i.test(logStr)) {
    leakedKeys.push('bearer_header');
  }

  // Check for raw base64 data payloads
  if (BASE64_DATA_REGEX.test(logStr) || /"data:[^"]+;base64,/.test(logStr)) {
    leakedKeys.push('base64_payload');
  }

  // Check for Google client secrets
  if (/"client_secret"\s*:\s*"[^"]+"/.test(logStr)) {
    leakedKeys.push('client_secret');
  }

  const clean = leakedKeys.length === 0;
  const sanitized = typeof logInput === 'object' && logInput !== null ? sanitizeLogObject(logInput) : { log: logStr };

  return { clean, sanitized, leakedKeys };
}
