import { clearPersistedCache } from './persister';
import { queryClient } from './query-client';
import { clearCachedToken } from './token-store';

export { apiClient, apiRequest } from './client';
export { clearPersistedCache, createIDBPersister } from './persister';
export { queryClient } from './query-client';
export * from './query-keys';
export { clearCachedToken } from './token-store';

/**
 * Clear all caches during logout to prevent data leakage between users
 * This clears:
 * - React Query cache (in-memory)
 * - IndexedDB persisted cache
 * - Cached JWT token
 */
export async function clearAllCaches() {
  // Clear React Query cache
  queryClient.clear();

  // Clear IndexedDB persisted cache
  await clearPersistedCache();

  // Clear in-memory token
  clearCachedToken();
}
