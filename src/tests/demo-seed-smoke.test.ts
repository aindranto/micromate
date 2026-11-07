/**
 * Demo seed smoke tests — small, focused, no test framework.
 *
 * Run:  npx tsx src/tests/demo-seed-smoke.test.ts
 *        (or: npm run test:demo-seed)
 *
 * What this covers (the bug fixed in v0.2.4.1, reported from a real phone):
 *  - Choosing "Gunakan Data Contoh (Demo Assets)" in setup showed an
 *    empty dashboard. Root cause: the setup choice never seeded anything;
 *    demo assets only appeared via the one-time init seeding, gated by
 *    the `micromate_db_seeded` flag. Once the flag was 'true' and demo
 *    data had been cleared, no later "demo" choice could bring it back.
 *  - seedDemoData() restores the 4 demo assets on demand, idempotently,
 *    without touching user records.
 *
 * How it runs in Node (no browser):
 *  - Same setup as sync-queue-smoke.test.ts: IndexedDB does not exist in
 *    Node, so DatabaseManager takes the localStorage fallback path.
 *  - localStorage and fetch are mocked on globalThis before db.ts is
 *    imported (dynamic import, so the mocks are in place first).
 *  - Each check uses a fresh DatabaseManager instance and a cleared
 *    mock localStorage, so checks do not leak state into each other.
 */

import assert from 'node:assert/strict';
import type { Asset } from '../types';
import { INITIAL_WORKSPACE_ID } from '../lib/seedData';

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

(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true }),
})) as unknown as typeof fetch;

/* Dynamic import AFTER the mocks are installed. */
const { DatabaseManager } = await import('../lib/db');

const DEMO_IDS = ['ast_macbook_m2', 'ast_vario_160', 'ast_lg_ac_1pk', 'ast_sony_a7iv'];

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
}

async function visibleAssets(db: InstanceType<typeof DatabaseManager>): Promise<Asset[]> {
  return db.getAllAssets(INITIAL_WORKSPACE_ID);
}

/* ------------------------------------------------------------------ */
/* Checks                                                               */
/* ------------------------------------------------------------------ */

console.log('demo-seed smoke tests (localStorage fallback, fetch mocked)');

await check('demo: seedDemoData restores the 4 demo assets after clearDemoData (reported bug)', async () => {
  reset();
  const db = new DatabaseManager();
  await db.init();
  assert.equal((await visibleAssets(db)).length, 4, 'init seeds 4 demo assets');
  const cleared = await db.clearDemoData();
  assert.equal(cleared, 4, 'clearDemoData removes 4 demo assets');
  assert.equal((await visibleAssets(db)).length, 0, 'dashboard reads empty after clear');
  assert.equal(store.get('micromate_db_seeded'), 'true', 'flag stays latched after clear');

  const added = await db.seedDemoData();
  assert.equal(added, 4, 'seedDemoData restores 4 assets');
  const list = await visibleAssets(db);
  assert.equal(list.length, 4);
  assert.deepEqual(
    list.map((a) => a.asset_id).sort(),
    [...DEMO_IDS].sort(),
  );
  assert.ok(list.every((a) => a.is_demo === true), 'restored assets are demo assets');
});

await check('demo: seedDemoData into an empty store with the flag already true (the latch)', async () => {
  reset();
  store.set('micromate_db_seeded', 'true');
  const db = new DatabaseManager();
  assert.equal((await visibleAssets(db)).length, 0, 'store starts empty');
  const added = await db.seedDemoData();
  assert.equal(added, 4);
  assert.equal((await visibleAssets(db)).length, 4);
});

await check('demo: seedDemoData is idempotent: second call adds nothing, no duplicates', async () => {
  reset();
  const db = new DatabaseManager();
  await db.init();
  assert.equal(await db.seedDemoData(), 0, 'nothing missing after init seed');
  assert.equal((await visibleAssets(db)).length, 4);
  assert.equal(await db.seedDemoData(), 0, 'second call also adds nothing');
  assert.equal((await visibleAssets(db)).length, 4);
});

await check('demo: seedDemoData leaves user assets untouched', async () => {
  reset();
  const db = new DatabaseManager();
  await db.init();
  const userAsset: Asset = {
    asset_id: 'ast_user_laptop',
    workspace_id: INITIAL_WORKSPACE_ID,
    category: 'device',
    name: 'Laptop Kerja Saya',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await db.saveAsset(userAsset, INITIAL_WORKSPACE_ID);
  assert.equal((await visibleAssets(db)).length, 5, '4 demo + 1 user asset');
  await db.clearDemoData();
  const afterClear = await visibleAssets(db);
  assert.equal(afterClear.length, 1, 'only the user asset survives the demo clear');
  assert.equal(afterClear[0].asset_id, 'ast_user_laptop');

  const added = await db.seedDemoData();
  assert.equal(added, 4);
  const list = await visibleAssets(db);
  assert.equal(list.length, 5, '4 demo restored + 1 user asset');
  assert.ok(list.some((a) => a.asset_id === 'ast_user_laptop'), 'user asset still present');
  assert.deepEqual(
    list.map((a) => a.asset_id).sort(),
    [...DEMO_IDS, 'ast_user_laptop'].sort(),
  );
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
