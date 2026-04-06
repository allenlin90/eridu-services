---
name: frontend-api-layer
description: Provides patterns for structuring the API layer in React applications. This skill should be used when setting up API clients, defining API request declarations, or integrating with TanStack Query for data fetching.
---

# Frontend API Layer

This skill provides patterns for structuring the API layer in React applications using TanStack Query and type-safe API clients.

## Canonical Examples

Study these real implementations:
- **API Client with Better Auth**: [client.ts](../../../apps/erify_studios/src/lib/api/client.ts)
- **Token Store**: [token-store.ts](../../../apps/erify_studios/src/lib/api/token-store.ts)
- **API Declarations**: [get-task-templates.ts](../../../apps/erify_studios/src/features/task-templates/api/get-task-templates.ts)

**Detailed Code Examples**: See [references/api-layer-examples.md](references/api-layer-examples.md)

---

## Architecture

```
Component
  ↓
TanStack Query Hook (useQuery/useMutation)
  ↓
API Declaration (getTaskTemplates, createTaskTemplate)
  ↓
API Client (apiClient.get/post/put/delete)
  ↓
Backend API
```

---

## Core Principles

1. **API Declarations**: Define all API requests in `{feature}/api/*.api.ts` files
2. **Type Safety**: Use shared types from `@eridu/api-types`
3. **Error Handling**: API client handles auth errors, API declarations handle business errors
4. **Query Keys**: Centralize query keys in API declaration files
5. **No FE Data Joins for Required Display Fields**: If a view needs stable display fields (e.g. assignee name), the primary API response must include them.

### No FE Data Join Rule (Required)

Do not compose critical list/detail display data by calling a second endpoint and joining on the frontend when:
- the secondary endpoint has stricter auth than the primary endpoint, or
- the field is required for normal rendering of the primary feature.

Example anti-pattern:
- shifts API returns only `user_id`
- frontend calls memberships API just to map `user_id -> user.name`
- memberships endpoint is admin-only, so member view breaks with 403

Correct approach:
- include `user_name` (or equivalent display field) in the primary shifts response contract
- keep frontend fetch scope to the feature API only

---

## API Client Setup

**⚠️ Important**: This project uses **Better Auth** for authentication with sophisticated token management. See [references/api-layer-examples.md](references/api-layer-examples.md) for the full implementation.

**Key Features**:
- Token caching with JWT expiration checking (`jose` library)
- Automatic token refresh on 401 with retry logic
- Better Auth integration via `authClient.client.token()`
- Distinguishes expired tokens (refresh) vs insufficient permissions (no redirect)
- In-memory token store (no localStorage for security)

**Simplified Overview**:

```typescript
// lib/api/client.ts
import axios from 'axios';
import { decodeJwt } from 'jose';
import { getCachedToken, setCachedToken } from '@/lib/api/token-store';
import { authClient } from '@/lib/auth';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Request: Check cached token, fetch if expired
apiClient.interceptors.request.use(async (config) => {
  let token = getCachedToken();
  if (!token || isTokenExpired(token)) {
    const session = await authClient.client.token();
    token = session?.data?.token;
    setCachedToken(token);
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: Refresh on 401 if expired, retry once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      // Refresh token and retry (see references for full logic)
    }
    return Promise.reject(error);
  }
);
```

**📖 See [references/api-layer-examples.md](references/api-layer-examples.md) for the complete implementation with step-by-step code.**

---

## API Declarations Pattern

**Pattern**: `features/{feature}/api/{feature}.api.ts`

```typescript
import { apiClient } from '@/lib/api-client';
import type { TaskTemplateDto, CreateTaskTemplateDto } from '@eridu/api-types';

// Query Keys — use hierarchical factory pattern
export const taskTemplateKeys = {
  all: ['task-templates'] as const,
  lists: () => [...taskTemplateKeys.all, 'list'] as const,
  // listPrefix matches ALL queries for a scope, regardless of filter params.
  // Use this key for mutation invalidation that affects any list for a studioId.
  listPrefix: (studioId: string) => [...taskTemplateKeys.lists(), studioId] as const,
  // list includes filters — use as the actual query key
  list: (studioId: string, filters?: unknown) => [...taskTemplateKeys.listPrefix(studioId), filters] as const,
  details: () => [...taskTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskTemplateKeys.details(), id] as const,
};

// API Functions
export async function getTaskTemplates(studioId: string, params?: { name?: string; cursor?: string; limit?: number }) {
  const { data } = await apiClient.get<{ data: TaskTemplateDto[]; meta: { total: number; nextCursor?: string } }>(
    `/studios/${studioId}/task-templates`,
    { params }
  );
  return data;
}

export async function createTaskTemplate(studioId: string, payload: CreateTaskTemplateDto) {
  const { data } = await apiClient.post<TaskTemplateDto>(`/studios/${studioId}/task-templates`, payload);
  return data;
}
```

**Key Points**:
- ✅ Centralize query keys using factory pattern with `listPrefix` + `list`
- ✅ Use shared types from `@eridu/api-types`
- ✅ Return typed responses
- ✅ Handle params and payload transformation

### AbortSignal Handling (Request Cancellation)

TanStack Query passes an `AbortSignal` through the `queryFn` context. Always destructure `{ signal }` (or `{ pageParam, signal }` for infinite queries) and forward it to the API fetcher so in-flight requests are cancelled when the component unmounts or the query key changes.

**API fetcher** — accept an optional `signal` parameter:

```typescript
export async function getItems(
  studioId: string,
  params: { page?: number; limit?: number; name?: string },
  options?: { signal?: AbortSignal },
): Promise<PaginatedResponse<ItemDto>> {
  const { data } = await apiClient.get<PaginatedResponse<ItemDto>>(
    `/studios/${studioId}/items`,
    { params, signal: options?.signal },
  );
  return data;
}
```

**Hook** — pass the signal from TanStack Query context:

```typescript
useInfiniteQuery({
  queryKey: itemQueryKeys.list(studioId, { search }),
  queryFn: ({ pageParam, signal }) =>
    getItems(studioId, { page: pageParam, limit: 10, name: search }, { signal }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
});
```

**Rules**:
- ✅ Always destructure `signal` from `queryFn` context — even if the fetcher signature is optional, pass it through
- ✅ API fetchers must accept `options?: { signal?: AbortSignal }` and forward to `apiClient.get/post`
- ✅ This prevents stale responses from appearing after a user navigates away mid-request
- ✅ For navigation-heavy internal-tool reads, cancellation is required even when the request is "just a GET" — otherwise route switches still consume backend throttle budget after the user leaves

### Searchable Lookup Query Contract

For searchable form/filter controls, the API layer must make the lookup contract explicit per field instead of leaving the UI to “figure it out”.

Rules:
- Build a field-by-field matrix during planning: control name, endpoint, scope discriminator (`studioId`, `admin`, etc.), supported search params, and whether fallback local filtering is allowed.
- If the UI uses `AsyncCombobox` / `AsyncMultiCombobox`, the fetcher and hook should expose real search state and pass it into the query key and API declaration.
- Include the scope discriminator in the query key for dual-scope helpers so studio/admin caches cannot collide.
- If a field cannot search remotely because the backend lacks an endpoint, document the local-filter fallback and keep it out of generic “async lookup” abstractions until the endpoint exists.
- Review/test expectation: for each searchable field family, verify that typing changes the query key or the documented local-filter state. A no-op `onSearch` is a broken implementation, not an acceptable placeholder.

### Searchable Lookup Hook Structure

When a file exports multiple hooks that each manage a `search` string + `useQuery` for a lookup field, the `useState`/`useQuery`/`staleTime`/`gcTime`/`enabled` boilerplate must be extracted into a shared internal helper rather than repeated per hook.

**Required pattern** (reference: `use-studio-show-form-lookup-options.ts`):

```ts
// Internal helper — not exported
function useSearchQuery<T>(
  segment: string,
  studioId: string,
  queryFn: (search: string, studioId: string, signal: AbortSignal | undefined) => Promise<{ data: T[] }>,
) {
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['<scope>', segment, studioId, { search }],
    queryFn: ({ signal }) => queryFn(search, studioId, signal),
    enabled: Boolean(studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });
  return { items: query.data?.data ?? [], isLoading: query.isLoading || query.isFetching, search, setSearch };
}

// Each exported hook only expresses what differs
export function useFooOptions(show: ..., studioId: string) {
  const { items, isLoading, setSearch } = useSearchQuery('foos', studioId, (search, sid, signal) =>
    getFoos({ name: search || undefined, limit: search ? SEARCH_LIMIT : DEFAULT_LIMIT }, sid, { signal }),
  );
  const options = useMemo(() => withSelectedOption(items.map(...), ...), [items, ...]);
  return { options, isLoading, setSearch };
}
```

Rules:
- Extract the shared helper when two or more lookup hooks exist in the same file — do not wait for three.
- The helper should not be exported; it is an implementation detail of the hook file.
- Exception: hooks with genuinely different query config (no `enabled`, different `staleTime`, polling) should not be forced into the shared helper.
- Existing files with this pattern already applied: `use-studio-show-form-lookup-options.ts`.
- Existing files that still need refactoring: `use-platforms-field-data.ts`, `use-creators-field-data.ts`, `use-client-field-data.ts` (all under `shows/components/hooks/`).

### Internal Read Freshness Policy

`erify_studios` uses tiered query freshness instead of `staleTime: 0` everywhere:

- **Interactive reads** (default list/detail navigation): short warm cache, currently `20s`
- **Operational reads** (for example `/me/*` task/shift views): shorter freshness, currently `5s`, with focus/reconnect refetch enabled
- **Lookup/reference reads**: long stale window, often `1h`

Rules:
- Do not set global `staleTime: 0` for internal-tool apps with route churn unless you have measured that the extra remount traffic is acceptable.
- Prefer explicit manual refresh or mutation invalidation over always-refetch-on-focus for ordinary studio admin pages.
- If a query is mounted during navigation and the user can leave before it completes, combine this freshness policy with `AbortSignal` forwarding.

### Query Key Memoization

Query key factory calls (e.g., `taskTemplateQueryKeys.list(studioId, { search })`) create a **new array reference on every render**. When used as `useEffect` or `useCallback` dependencies this causes unnecessary re-runs (or ESLint `exhaustive-deps` violations).

**Rule**: Wrap query key factory calls in `useMemo` when they are used outside the `queryKey` option (e.g., in `useEffect` cleanup, `setQueryData`, `invalidateQueries`).

```typescript
// ✅ Memoize the query key so useEffect only re-runs when studioId or searchQuery changes
const listQueryKey = useMemo(
  () => itemQueryKeys.list(studioId, { search: searchQuery }),
  [studioId, searchQuery],
);

useEffect(() => () => {
  // Compact the infinite query cache on unmount — listQueryKey is stable
  queryClient.setQueryData(listQueryKey, compactPages);
}, [listQueryKey, queryClient]);
```

**When to apply**: Any time a query key is used outside the `queryKey` option of `useQuery`/`useInfiniteQuery`.

### Why `listPrefix` for Mutation Invalidation

When a mutation affects all entries for a scope, invalidating by the exact `list(studioId, filters)` key only clears one cached filter combination. `listPrefix(studioId)` invalidates ALL cached queries for that studio regardless of which filters the user had active:

```typescript
// ❌ Only clears the query with exact currentFilters — other filter combos stay stale
queryClient.invalidateQueries({ queryKey: studioShowsKeys.list(studioId, currentFilters) });

// ✅ Clears ALL list queries for this studio (any filter combination)
queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
```

**Rule**: Use `listPrefix` in mutations that change data visible in any list (e.g., assign, generate tasks, bulk delete). Use `list(...)` only in `queryKey` for `useQuery`/`useInfiniteQuery` hooks.

### Dual-Endpoint + Query Key Cache Isolation

Some API functions serve **both admin and studio contexts** (e.g., `getShowTypes` hits `/admin/show-types` or `/studios/:studioId/show-types`). The query key **must include the scope** to prevent cache collisions.

```typescript
// api/get-show-types.ts — the fetcher accepts optional studioId
export async function getShowTypes(params: GetShowTypesParams, studioId?: string) {
  const endpoint = studioId ? `/studios/${studioId}/show-types` : '/admin/show-types';
  const { data } = await apiClient.get<ShowTypesResponse>(endpoint, { params });
  return data;
}

// hooks/use-show-type-field-data.ts — include scope in query key
export function useShowTypeFieldData(show: Show | null, studioId?: string) {
  return useQuery({
    queryKey: ['show-types', 'list', studioId ?? 'admin', 'all'],  // ← scope discriminator
    queryFn: () => getShowTypes({ limit: 100 }, studioId),
    // staleTime: Infinity // Only set if this is static reference data, otherwise omit to rely on global staleTime: 0
  });
}
```

**Rule**: `studioId ?? 'admin'` as a key segment prevents a studio-scoped fetch from poisoning the admin cache (and vice versa). Apply this pattern whenever the same fetcher can hit different base paths.

---

## TanStack Query Integration

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaskTemplates, createTaskTemplate, taskTemplateKeys } from '../api/task-templates.api';

export function useTaskTemplates(studioId: string, filters: { name?: string }) {
  return useQuery({
    queryKey: taskTemplateKeys.list(studioId, JSON.stringify(filters)),
    queryFn: () => getTaskTemplates(studioId, filters),
  });
}

export function useCreateTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskTemplateDto) => createTaskTemplate(studioId, payload),
    onSuccess: () => {
      // listPrefix invalidates all cached list variants for this studio
      queryClient.invalidateQueries({ queryKey: taskTemplateKeys.listPrefix(studioId) });
    },
  });
}

// Write-through cache update — patch the list immediately, then invalidate
// Use when the API returns the updated item and you want zero perceived latency
export function useUpdateTask(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskRequest }) =>
      updateMyTask(taskId, data),
    onSuccess: (updatedTask) => {
      // 1. Patch the cached list entries immediately (write-through)
      queryClient.setQueriesData<PaginatedResponse<TaskDto>>(
        { queryKey: myTasksKeys.lists() },
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((t) =>
              t.id === updatedTask.id ? { ...t, ...updatedTask } : t,
            ),
          };
        },
      );
      // 2. Invalidate to fetch fresh data in background
      queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
    },
  });
}

// Silent mutation pattern — suppress global error toasts and cache invalidation for background saves
// Use for autosave / debounced background operations that should not interrupt the user
//
// Pattern: add `silent?: boolean` to the variables type, guard invalidations with
// `if (!variables.silent)`, and specify `meta: { suppressErrorToast: true }` natively.
export function useUpdateMyTask() {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, Error, { taskId: string; data: TaskActionRequest; silent?: boolean }>({
    mutationFn: ({ taskId, data }) => updateMyTask(taskId, data),
    onSuccess: (updatedTask, variables) => {
      // Write-through always runs (keeps list UI in sync)
      queryClient.setQueriesData<PaginatedResponse<TaskWithRelationsDto>>(
        { queryKey: myTasksKeys.lists() },
        (prev) => {
          if (!prev) return prev;
          return { ...prev, data: prev.data.map((t) => t.id === updatedTask.id ? { ...t, ...updatedTask } : t) };
        },
      );
      if (!variables.silent) {
        // Full invalidation + toast only for explicit user actions
        queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
        toast.success('Task updated successfully');
      }
    },
    // Override the global error handler dynamically based on the mutation variables if necessary
    // or just rely on the global generic fallback. No need to rewrite error toasting here!
  });
}
```

---

## Best Practices Checklist

- [ ] API client configured with Better Auth token management (see references)
- [ ] Token caching with JWT expiration checking implemented
- [ ] Automatic token refresh on 401 with retry logic
- [ ] All API requests defined in `{feature}/api/*.api.ts` files
- [ ] Query keys centralized using factory pattern
- [ ] Shared types from `@eridu/api-types` used for requests/responses
- [ ] TanStack Query hooks use query keys from API declarations
- [ ] Mutations invalidate relevant queries on success
- [ ] Error handling: API client (auth), components (business logic)
- [ ] API fetchers accept `options?: { signal?: AbortSignal }` and forward to `apiClient`
- [ ] `queryFn` destructures and passes `signal` from TanStack Query context
- [ ] Query key factory calls used outside `queryKey` option are wrapped in `useMemo`

---

## Route Loader Prefetch Pattern

`erify_studios` uses TanStack Router with `queryClient` threaded into the router context, enabling route-level prefetching before components mount.

### Setup

`queryClient` (singleton from `apps/erify_studios/src/lib/api/query-client.ts`) is passed directly into the router context:

```typescript
// router.tsx
import { queryClient } from '@/lib/api';

export const router = createRouter({
  context: { auth: undefined!, queryClient },
});
```

The root route context type includes `QueryClient`:

```typescript
// routes/__root.tsx
createRootRouteWithContext<{ auth: Session; queryClient: QueryClient }>()
```

### Loader Pattern

Use `void queryClient.prefetchQuery(...)` in route `loader` functions to start fetches on navigation, before components mount. This is non-blocking — navigation proceeds immediately while fetches run in parallel.

```typescript
export const Route = createFileRoute('/studios/$studioId/task-reports/builder')({
  component: TaskReportBuilderPage,
  validateSearch: ...,
  loader: ({ context: { queryClient }, params: { studioId }, search }) => {
    // Prefetch optional deep-link data
    if (search.definition_id) {
      void queryClient.prefetchQuery({
        queryKey: taskReportDefinitionKeys.detail(studioId, search.definition_id),
        queryFn: ({ signal }) => getTaskReportDefinition(studioId, search.definition_id!, { signal }),
      });
    }
    // Prefetch lookup data — warm before ReportScopeFilters renders
    void queryClient.prefetchQuery({
      queryKey: ['show-types', 'list', studioId, 'report-scope'],
      queryFn: ({ signal }) => getShowTypes({ limit: 200 }, studioId, { signal }),
    });
  },
});
```

**Rules:**
- Use `void prefetchQuery` (not `await ensureQueryData`) to avoid blocking navigation
- Match query keys exactly to what the component's `useQuery` calls use — mismatches silently skip the warm cache
- Prefer prefetching critical page data (show detail, task list, first-page lookups) over optional supplementary data
- Component hooks still fire as normal; they find warm cache and skip the loading state

### Query Lifting for Prefetch Compatibility

To make a component's queries prefetchable via a route loader, lift them from the child component up to the page/route level and pass results as props.

Example: `ReportScopeFilters` originally fetched show types, show standards, and clients internally. These were moved to `ReportBuilder` (the parent) so the route loader can warm all three caches before the component tree renders. `ReportScopeFilters` now accepts `showTypeOptions`, `showStandardOptions`, and `clientOptions` as props.

**When to lift:**
- A filter/lookup component fetches reference data that is the same for all users in a studio
- The data should be warm by the time the user sees the filter UI
- The parent route already knows all parameters needed for the query

**Canonical implementation:** [report-builder.tsx](../../../apps/erify_studios/src/features/task-reports/components/report-builder.tsx), [report-scope-filters.tsx](../../../apps/erify_studios/src/features/task-reports/components/report-scope-filters.tsx)

---

## Related Skills

- [frontend-state-management](../frontend-state-management/SKILL.md) - State management patterns
- [frontend-error-handling](../frontend-error-handling/SKILL.md) - Error handling patterns
- [shared-api-types](../shared-api-types/SKILL.md) - Shared API types
