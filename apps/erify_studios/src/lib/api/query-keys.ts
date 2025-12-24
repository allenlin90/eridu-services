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
 * - GET /admin/:resource - Admin resource lists
 * - GET /admin/:resource/:id - Admin resource details
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

  // Admin resources
  admin: {
    all: ['admin'] as const,
    resource: (resource: string) => [...queryKeys.admin.all, resource] as const,
    lists: (resource: string) =>
      [...queryKeys.admin.resource(resource), 'list'] as const,
    list: (resource: string, filters: Record<string, any>) =>
      [...queryKeys.admin.lists(resource), filters] as const,
    details: (resource: string) =>
      [...queryKeys.admin.resource(resource), 'detail'] as const,
    detail: (resource: string, id: string) =>
      [...queryKeys.admin.details(resource), id] as const,
  },
} as const;
