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

---

## Related Skills

- [frontend-state-management](../frontend-state-management/SKILL.md) - State management patterns
- [frontend-error-handling](../frontend-error-handling/SKILL.md) - Error handling patterns
- [shared-api-types](../shared-api-types/SKILL.md) - Shared API types
