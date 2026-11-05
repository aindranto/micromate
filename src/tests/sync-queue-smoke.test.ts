/**
 * Sync queue smoke tests — small, focused, no test framework.
 *
 * Run:  npx tsx src/tests/sync-queue-smoke.test.ts
 *        (or: npm run test:sync-queue)
 *
 * What this covers (the critical path fixed in v0.1.0, previously untested):
 *  - addToSyncQueue stores items and derives entity from action
 *  - idempotent queueing: same explicit mutation_id is stored once
 *  - backoff schedule and error classification (retryable vs permanent)
 *  - flushSyncQueue: no URL, success, retryable failure, permanent failure,
 *    stale PROCESSING lease recovery, hasPendingMutation
 *
 * How it runs in Node (no browser):
 *  - IndexedDB does not exist in Node, so DatabaseManager takes the same
 *    localStorage fallback path the app uses on unsupported browsers.
 *  - localStorage and fetch are mocked on globalThis before db.ts is
 *    imported (dynamic import, so the mocks are in place first).
 *  - Each check uses a fresh DatabaseManager instance and a cleared
 *    mock localStorage, so checks do not leak state into each other.
 *  - No network: fetch is fully mocked. No real Apps Script URL is used.
 */

import assert from 'node:assert/strict';
import type { SyncQueueItem } from '../types';

/* ------------------------------------------------------------------ */
/* Mocks (installed before db.ts is imported)                          */
/* ------------------------------------------------------------------ */

const store = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return store.size;
  },
  key(index: number): string | null {
    return Array.from(store.keys())[index] ?? null;
  },
  getItem(key: string): string | null {
    return store.has(key) ? store.get(key)! : null;
  },
  setItem(key: string, value: string): void {
    store.set(key, String(value));
  },
  removeItem(key: string): void {
    store.delete(key);
  },
  clear(): void {
    store.clear();
  },
};
(globalThis as unknown as { localStorage: Storage }).localStorage = localStorageMock;

type FetchHandler = (url: unknown, init?: unknown) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;
let fetchHandler: FetchHandler = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true }),
});
(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (
  url: unknown,
  init?: unknown,
) => fetchHandler(url, init)) as unknown as typeof fetch;

/* Dynamic import AFTER the mocks are installed. */
const { DatabaseManager } = await import('../lib/db');

const SYNC_QUEUE_KEY = 'micromate_sync_queue_v1';
const APPS_SCRIPT_URL_KEY = 'micromate_apps_script_url';

/* ------------------------------------------------------------------ */
/* Tiny harness                                                         */
/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    failures.push(`${name}: ${message}`);
    console.log(`  FAIL  ${name}\n        ${message}`);
  }
}

function reset(): void {
  store.clear();
  fetchHandler = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
  });
}

/** fetch mock that answers like a healthy Apps Script endpoint. */
function installSuccessFetch(): void {
  fetchHandler = async (_url: unknown, init?: unknown) => {
    const body = typeof init === 'object' && init !== null && 'body' in init
      ? String((init as { body?: unknown }).body ?? '')
      : '';
    if (body.includes('getAllAssets')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, assets: [], sync_timestamp: new Date().toISOString() }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ success: true }) };
  };
}

/** fetch mock that fails every request (network down). */
function installThrowingFetch(): void {
  fetchHandler = async () => {
    throw new Error('network down');
  };
}

/** fetch mock that answers HTTP 400 for every request. */
function installHttp400Fetch(): void {
  fetchHandler = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: 'validation_error' }),
  });
}

function readQueue(): SyncQueueItem[] {
  const raw = store.get(SYNC_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as SyncQueueItem[]) : [];
}

/* ------------------------------------------------------------------ */
/* Checks                                                               */
/* ------------------------------------------------------------------ */

console.log('sync-queue smoke tests (localStorage fallback, fetch mocked)');

await check('queue: addToSyncQueue stores a PENDING item with entity derived from action', async () => {
  reset();
  const db = new DatabaseManager();
  const item = await db.addToSyncQueue('saveAsset', { asset_id: 'AST-1' });
  assert.equal(item.status, 'PENDING');
  assert.equal(item.entity, 'ASSET');
  assert.equal(item.entity_id, 'AST-1');
  assert.ok(item.mutation_id.startsWith('MUT-'));
  const queue = await db.getAllSyncQueueItems();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, item.id);
});

await check('queue: same explicit mutation_id is stored only once (idempotent)', async () => {
  reset();
  const db = new DatabaseManager();
  const first = await db.addToSyncQueue('syncReminder', { reminder_id: 'R-1' }, 'REMINDER', 'R-1', '', 'MUT-TEST-1');
  const second = await db.addToSyncQueue('syncReminder', { reminder_id: 'R-1' }, 'REMINDER', 'R-1', '', 'MUT-TEST-1');
  assert.equal(second.id, first.id);
  assert.equal((await db.getAllSyncQueueItems()).length, 1);
});

await check('backoff: 5s, 15s, 60s, 120s, then 300s capped', () => {
  const db = new DatabaseManager();
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 10].map((n) => db.calculateBackoffDelaySeconds(n)),
    [5, 5, 15, 60, 120, 300, 300],
  );
});

await check('classify: 4xx/session errors are permanent, 5xx/429/offline are retryable', () => {
  const db = new DatabaseManager();
  assert.equal(db.classifySyncError(400, 'bad request').isRetryable, false);
  assert.equal(db.classifySyncError(401, 'unauthorized').isRetryable, false);
  assert.equal(db.classifySyncError(403, 'forbidden').isRetryable, false);
  assert.equal(db.classifySyncError(422, 'unprocessable').isRetryable, false);
  assert.equal(db.classifySyncError(200, 'session_expired').isRetryable, false);
  assert.equal(db.classifySyncError(200, 'invalid_token').isRetryable, false);
  assert.equal(db.classifySyncError(500, 'server error').isRetryable, true);
  assert.equal(db.classifySyncError(429, 'rate limited').isRetryable, true);
  assert.equal(db.classifySyncError(0, 'network down').isRetryable, true);
  assert.equal(db.classifySyncError(500, 'boom').type, 'RETRYABLE');
  assert.equal(db.classifySyncError(400, 'x').type, 'NON_RETRYABLE');
});

await check('flush: without an Apps Script URL it reports NO_APPS_SCRIPT_URL and touches nothing', async () => {
  reset();
  const db = new DatabaseManager();
  await db.addToSyncQueue('syncReminder', { reminder_id: 'R-2' }, 'REMINDER', 'R-2');
  const result = await db.flushSyncQueue();
  assert.equal(result.success, false);
  assert.equal(result.reason, 'NO_APPS_SCRIPT_URL');
  assert.equal(result.processed, 0);
  assert.equal(result.failed, 0);
  assert.equal((await db.getAllSyncQueueItems()).length, 1);
});

await check('flush: success marks the item done, removes it, clears pending state', async () => {
  reset();
  installSuccessFetch();
  store.set(APPS_SCRIPT_URL_KEY, 'https://script.google.example/exec');
  const db = new DatabaseManager();
  await db.addToSyncQueue('syncReminder', { reminder_id: 'R-3' }, 'REMINDER', 'R-3');
  assert.equal(await db.hasPendingMutation('REMINDER', 'R-3'), true);
  const result = await db.flushSyncQueue();
  assert.equal(result.success, true);
  assert.equal(result.processed, 1);
  assert.equal(result.failed, 0);
  assert.equal((await db.getAllSyncQueueItems()).length, 0);
  assert.equal(await db.hasPendingMutation('REMINDER', 'R-3'), false);
});

await check('flush: network failure keeps the item as FAILED_RETRYABLE with backoff', async () => {
  reset();
  installThrowingFetch();
  store.set(APPS_SCRIPT_URL_KEY, 'https://script.google.example/exec');
  const db = new DatabaseManager();
  await db.addToSyncQueue('syncReminder', { reminder_id: 'R-4' }, 'REMINDER', 'R-4');
  const result = await db.flushSyncQueue();
  assert.equal(result.success, false);
  assert.equal(result.processed, 0);
  assert.equal(result.failed, 1);
  const queue = await db.getAllSyncQueueItems();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].status, 'FAILED_RETRYABLE');
  assert.equal(queue[0].retry_count, 1);
  assert.ok(queue[0].next_retry_at !== undefined);
  assert.ok(new Date(queue[0].next_retry_at!).getTime() > Date.now());
});

await check('flush: HTTP 400 marks the item FAILED_PERMANENT (never retried)', async () => {
  reset();
  installHttp400Fetch();
  store.set(APPS_SCRIPT_URL_KEY, 'https://script.google.example/exec');
  const db = new DatabaseManager();
  await db.addToSyncQueue('syncReminder', { reminder_id: 'R-5' }, 'REMINDER', 'R-5');
  const result = await db.flushSyncQueue();
  assert.equal(result.success, false);
  assert.equal(result.failed, 1);
  const queue = await db.getAllSyncQueueItems();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].status, 'FAILED_PERMANENT');
  assert.equal(queue[0].error_type, 'NON_RETRYABLE');
});

await check('flush: a PROCESSING item stuck over 60s is recovered and then sent', async () => {
  reset();
  installSuccessFetch();
  store.set(APPS_SCRIPT_URL_KEY, 'https://script.google.example/exec');
  const db = new DatabaseManager();
  const stuck: SyncQueueItem = {
    id: 'sync_stuck_1',
    mutation_id: 'MUT-STUCK-1',
    action: 'syncReminder',
    entity: 'REMINDER',
    entity_id: 'R-6',
    asset_id: '',
    workspaceId: 'default',
    data: { reminder_id: 'R-6' },
    created_at: new Date(Date.now() - 120_000).toISOString(),
    timestamp: new Date(Date.now() - 120_000).toISOString(),
    retry_count: 0,
    retryCount: 0,
    status: 'PROCESSING',
    processing_started_at: new Date(Date.now() - 61_000).toISOString(),
  };
  store.set(SYNC_QUEUE_KEY, JSON.stringify([stuck]));
  const result = await db.flushSyncQueue();
  assert.equal(result.success, true);
  assert.equal(result.processed, 1);
  assert.equal((await db.getAllSyncQueueItems()).length, 0);
});

await check('queue: removeSyncQueueItem drops only the named item', async () => {
  reset();
  const db = new DatabaseManager();
  const a = await db.addToSyncQueue('syncReminder', { reminder_id: 'R-7' }, 'REMINDER', 'R-7');
  await db.addToSyncQueue('syncReminder', { reminder_id: 'R-8' }, 'REMINDER', 'R-8');
  assert.equal((await db.getAllSyncQueueItems()).length, 2);
  await db.removeSyncQueueItem(a.id);
  const remaining = await db.getAllSyncQueueItems();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].entity_id, 'R-8');
  assert.equal(readQueue().length, 1);
});

await check('queue: retryQueueItem resets a failed item back to PENDING', async () => {
  reset();
  installThrowingFetch();
  store.set(APPS_SCRIPT_URL_KEY, 'https://script.google.example/exec');
  const db = new DatabaseManager();
  const item = await db.addToSyncQueue('syncReminder', { reminder_id: 'R-9' }, 'REMINDER', 'R-9');
  await db.flushSyncQueue();
  assert.equal((await db.getAllSyncQueueItems())[0].status, 'FAILED_RETRYABLE');
  assert.equal(await db.retryQueueItem(item.id), true);
  const queue = await db.getAllSyncQueueItems();
  assert.equal(queue[0].status, 'PENDING');
  assert.equal(queue[0].retry_count, 0);
});

/* ------------------------------------------------------------------ */
/* Summary                                                              */
/* ------------------------------------------------------------------ */

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
}
