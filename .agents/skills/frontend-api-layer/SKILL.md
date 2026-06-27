---
name: frontend-api-layer
description: Provides patterns for structuring the API layer in React applications. This skill should be used when setting up API clients, defining API request declarations, or integrating with TanStack Query for data fetching.
---

# Frontend API Layer

Patterns for the API layer in React applications using TanStack Query and type-safe API clients.

## Canonical Examples

- **API Client**: [client.ts](../../../apps/erify_studios/src/lib/api/client.ts)
- **Token Store**: [token-store.ts](../../../apps/erify_studios/src/lib/api/token-store.ts)
- **API Declaration**: [get-task-templates.ts](../../../apps/erify_studios/src/features/task-templates/api/get-task-templates.ts)

> See [references/api-layer-examples.md](references/api-layer-examples.md) for full code examples.

## Architecture

```
Component → TanStack Query Hook → API Declaration → API Client → Backend
```

## Core Rules

1. **API Declarations** in `{feature}/api/*.api.ts` files
2. **Type Safety**: Shared types from `@eridu/api-types`
3. **Query Keys**: Centralize using factory pattern with `listPrefix` + `list`
4. **No FE Data Joins**: If a view needs a display field, the primary API must include it. Do not call a second endpoint and join client-side.
5. **Canonical Resource Routes**: Call canonical collection endpoints with `target_type`/`target_id` filters, not deeply nested paths mirroring component placement.
6. **Decimal Normalization**: Normalize both stored API value and user input through the same money helper before comparing.
7. **AbortSignal**: Always destructure `{ signal }` from `queryFn` context and forward to API fetchers.

## Query Key Factory Pattern

```typescript
export const taskTemplateKeys = {
  all: ['task-templates'] as const,
  lists: () => [...taskTemplateKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...taskTemplateKeys.lists(), studioId] as const,
  list: (studioId: string, filters?: unknown) => [...taskTemplateKeys.listPrefix(studioId), filters] as const,
  detail: (id: string) => [...taskTemplateKeys.all, 'detail', id] as const,
};
```

- Use `listPrefix` for mutation invalidation (clears ALL filter combos for a scope)
- Use `list(...)` in `queryKey` for `useQuery`/`useInfiniteQuery`
- Memoize query key calls in `useMemo` when used outside `queryKey` option

## Mutation Patterns

- After success: invalidate with `listPrefix`, not exact `list` key
- Write-through cache: `setQueriesData` for immediate UI, then `invalidateQueries`
- Silent mutations (autosave): add `silent?: boolean` to variables, guard invalidation with `if (!variables.silent)`, set `meta: { suppressErrorToast: true }`

## Searchable Lookup Contract

- Build a field-by-field matrix: control name, endpoint, scope, search params, fallback
- Include scope discriminator in query key (`studioId ?? 'admin'`) for dual-scope helpers
- Extract shared `useSearchQuery` helper when 2+ lookup hooks exist in same file
- Dead `onSearch` wiring = broken implementation, not acceptable placeholder

## Route Loader Prefetch

```typescript
loader: ({ context: { queryClient }, params: { studioId } }) => {
  void queryClient.prefetchQuery({ queryKey, queryFn });
},
```

- Use `void prefetchQuery` (non-blocking), not `await ensureQueryData`
- Match query keys exactly to component `useQuery` calls
- Lift queries to parent when child data should be warm before render

## Internal Read Freshness Policy

| Tier | Stale time | Example |
|---|---|---|
| Interactive (default) | ~20s | List/detail navigation |
| Operational | ~5s | `/me/*` task/shift views |
| Lookup/reference | ~1h | Static reference data |

## Checklist

- [ ] API client configured with Better Auth token management
- [ ] All requests in `{feature}/api/*.api.ts`
- [ ] Query keys use factory pattern with `listPrefix`
- [ ] Types from `@eridu/api-types`
- [ ] `signal` forwarded to API fetchers
- [ ] Mutations invalidate via `listPrefix`, not exact key
- [ ] No FE data joins for required display fields
- [ ] Money comparisons normalized through same helper

## Related Skills

- [frontend-state-management](../frontend-state-management/SKILL.md) — State management patterns
- [frontend-error-handling](../frontend-error-handling/SKILL.md) — Error handling
- [shared-api-types](../shared-api-types/SKILL.md) — Shared API types
