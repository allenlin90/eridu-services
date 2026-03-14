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
    listPrefix: () => [...queryKeys.shows.lists()] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.shows.listPrefix(), filters ?? {}] as const,
    details: () => [...queryKeys.shows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.shows.details(), id] as const,
  },

  // Future creator-focused economics query key namespace (Phase 4/5 extension seam)
  economics: {
    all: ['me', 'economics'] as const,
    summaries: () => [...queryKeys.economics.all, 'summary'] as const,
    summary: (scope: { showId?: string; dateFrom?: string; dateTo?: string }) =>
      [...queryKeys.economics.summaries(), scope] as const,
    details: () => [...queryKeys.economics.all, 'detail'] as const,
    detail: (showId: string) => [...queryKeys.economics.details(), showId] as const,
  },

  // Future creator compensation query key namespace (Phase 4/5 extension seam)
  compensation: {
    all: ['me', 'compensation'] as const,
    lists: () => [...queryKeys.compensation.all, 'list'] as const,
    list: (scope: { showId?: string; dateFrom?: string; dateTo?: string } = {}) =>
      [...queryKeys.compensation.lists(), scope] as const,
    details: () => [...queryKeys.compensation.all, 'detail'] as const,
    detail: (showId: string) => [...queryKeys.compensation.details(), showId] as const,
  },
} as const;
