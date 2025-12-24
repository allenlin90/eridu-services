import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

/**
 * IndexedDB Persister for TanStack Query
 *
 * Benefits:
 * - Larger storage capacity than localStorage (no 5MB limit)
 * - Faster read/write for structured data
 * - No serialization required for native types (Date, File, etc.)
 * - Asynchronous operations (non-blocking)
 * - PWA-ready for offline support
 *
 * @param idbValidKey - IndexedDB key for storing query cache (default: 'erify-studios-query-cache')
 */
export function createIDBPersister(idbValidKey: IDBValidKey = 'erify-studios-query-cache') {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbValidKey, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbValidKey);
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  } satisfies Persister;
}

/**
 * Clear the persisted cache from IndexedDB
 * This should be called during logout to prevent cache leakage between users
 */
export async function clearPersistedCache(idbValidKey: IDBValidKey = 'erify-studios-query-cache') {
  await del(idbValidKey);
}
