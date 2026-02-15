---
name: frontend-api-layer
description: Provides patterns for structuring the API layer in React applications. This skill should be used when setting up API clients, defining API request declarations, or integrating with TanStack Query for data fetching.
---

# Frontend API Layer

This skill provides patterns for structuring the API layer in React applications using TanStack Query and type-safe API clients.

## Canonical Examples

Study these real implementations:
- **API Client**: [api-client.ts](file:///Users/allenlin/Desktop/projects/eridu-services/apps/erify_studios/src/lib/api-client.ts)
- **API Declarations**: [task-templates.api.ts](file:///Users/allenlin/Desktop/projects/eridu-services/apps/erify_studios/src/features/task-templates/api/task-templates.api.ts)

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

---

## API Client Setup

```typescript
// lib/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## API Declarations Pattern

**Pattern**: `features/{feature}/api/{feature}.api.ts`

```typescript
import { apiClient } from '@/lib/api-client';
import type { TaskTemplateDto, CreateTaskTemplateDto } from '@eridu/api-types';

// Query Keys
export const taskTemplateKeys = {
  all: ['task-templates'] as const,
  lists: () => [...taskTemplateKeys.all, 'list'] as const,
  list: (studioId: string, filters: string) => [...taskTemplateKeys.lists(), studioId, filters] as const,
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
- ✅ Centralize query keys using factory pattern
- ✅ Use shared types from `@eridu/api-types`
- ✅ Return typed responses
- ✅ Handle params and payload transformation

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
      queryClient.invalidateQueries({ queryKey: taskTemplateKeys.lists() });
    },
  });
}
```

---

## Best Practices Checklist

- [ ] API client configured with base URL and interceptors
- [ ] All API requests defined in `{feature}/api/*.api.ts` files
- [ ] Query keys centralized using factory pattern
- [ ] Shared types from `@eridu/api-types` used for requests/responses
- [ ] TanStack Query hooks use query keys from API declarations
- [ ] Mutations invalidate relevant queries on success
- [ ] Error handling in API client (auth) and components (business logic)

---

## Related Skills

- [frontend-state-management](../frontend-state-management/SKILL.md) - State management patterns
- [frontend-error-handling](../frontend-error-handling/SKILL.md) - Error handling patterns
- [shared-api-types](../shared-api-types/SKILL.md) - Shared API types
