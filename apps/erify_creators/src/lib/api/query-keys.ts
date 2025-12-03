/**
 * Query Key Factory
 *
 * Centralized query key management following TanStack Query best practices
 * https://tkdodo.eu/blog/effective-react-query-keys
 *
 * API Structure:
 * - GET /me - Current user profile
 * - GET /me/shows - List of shows assigned to current user
 * - GET /me/shows/:id - Show detail for current user
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy invalidation by scope
 * - Prevents key collisions
 * - Self-documenting API structure
 */

export const queryKeys = {
  // Current user profile
  me: {
    all: ['me'] as const,
    profile: () => [...queryKeys.me.all, 'profile'] as const,
  },

  // Shows assigned to current user
  shows: {
    all: ['me', 'shows'] as const,
    lists: () => [...queryKeys.shows.all, 'list'] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.shows.lists(), filters] as const,
    details: () => [...queryKeys.shows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.shows.details(), id] as const,
  },
} as const;
