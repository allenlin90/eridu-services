# Frontend API Layer - Code Examples

This file contains detailed API layer examples extracted from the main SKILL.md.

## Complete API Client Setup with Better Auth

### Step 1: Token Store (In-Memory Cache)

```typescript
// lib/api/token-store.ts
/**
 * In-memory store for the JWT token
 *
 * This avoids circular dependencies between client.ts and auth.ts
 * and allows efficient token access without async calls
 */
let cachedToken: string | null = null;

export const getCachedToken = () => cachedToken;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export function clearCachedToken() {
  cachedToken = null;
}
```

### Step 2: API Client Configuration

```typescript
// lib/api/client.ts
import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { decodeJwt } from 'jose';

import { getCachedToken, setCachedToken } from '@/lib/api/token-store';
import { authClient } from '@/lib/auth';

/**
 * API Client Configuration
 *
 * Security Best Practices:
 * - JWT tokens attached via interceptor (not stored in client)
 * - Tokens retrieved fresh from auth client on each request
 * - JWT expiration checked before attempting refresh (reduces auth server load)
 * - Automatic token refresh on expiration with retry
 * - Automatic redirect to login on authentication failure
 * - CSRF protection via SameSite cookies (handled by Better Auth)
 */

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Security: withCredentials enables cookies for CSRF protection
  withCredentials: true,
});
```

### Step 3: JWT Expiration Check

```typescript
// lib/api/client.ts (continued)

/**
 * Check if JWT token is expired or about to expire
 *
 * @param token - JWT token string
 * @param bufferSeconds - Consider token expired if it expires within this buffer (default: 60s)
 * @returns true if token is expired or about to expire
 */
function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  try {
    const decoded = decodeJwt(token);

    if (!decoded.exp) {
      // No expiration claim - consider it expired
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = decoded.exp;

    // Token is expired if current time + buffer >= expiration time
    return now + bufferSeconds >= expiresAt;
  } catch {
    // Failed to decode - consider it expired
    return true;
  }
}
```

### Step 4: Request Interceptor (Smart Token Management)

```typescript
// lib/api/client.ts (continued)

/**
 * Request Interceptor: Attach JWT Token
 *
 * Uses cached token when available and valid
 * Only fetches fresh token when cached token is expired or missing
 * This minimizes unnecessary session checks while ensuring valid tokens
 */
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Check cached token first
    let token = getCachedToken();

    // 2. If no cached token or expired, fetch fresh one
    // This only happens when making API calls, not continuously
    if (!token || isTokenExpired(token)) {
      try {
        const session = await authClient.client.token();
        if (session?.data?.token) {
          token = session.data.token;
          setCachedToken(token);
        }
      } catch (error) {
        // If token fetch fails, continue with cached token if available
        // The response interceptor will handle authentication failures
        console.warn('Failed to fetch fresh token, using cached token if available:', error);
      }
    }

    // 3. Attach token if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
```

### Step 5: Response Interceptor (Automatic Token Refresh)

```typescript
// lib/api/client.ts (continued)

/**
 * Response Interceptor: Handle JWT Expiration and Authentication Errors
 *
 * Flow:
 * 1. On 401 error, check if JWT is actually expired
 * 2. If expired, attempt single refresh via Better Auth
 * 3. If refresh succeeds with valid token, retry the original request
 * 4. If refresh fails or returns invalid token, redirect to login
 * 5. For non-expired tokens causing 401, don't redirect (insufficient permissions)
 *
 * This ensures session checks only happen during actual API calls and failures
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - JWT expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;

      // Extract token from original request
      const authHeader = originalRequest.headers?.Authorization as string | undefined;
      const token = authHeader?.replace('Bearer ', '');

      // Only attempt refresh if token exists and is actually expired
      // This prevents unnecessary refresh attempts for insufficient permissions
      if (token && isTokenExpired(token)) {
        try {
          // Single attempt to refresh session
          const session = await authClient.client.token();

          // If we got a valid, non-expired token, retry the request
          if (session?.data?.token && !isTokenExpired(session.data.token)) {
            // Update cache with fresh token
            setCachedToken(session.data.token);

            // Update the Authorization header
            originalRequest.headers.Authorization = `Bearer ${session.data.token}`;

            // Retry the original request with new token
            return apiClient(originalRequest);
          }

          // Refresh failed or returned invalid token - user needs to re-authenticate
          console.warn('Session refresh failed or returned invalid token, redirecting to login');
          authClient.redirectToLogin();
          return Promise.reject(error);
        } catch (refreshError) {
          // Session refresh failed completely - redirect to login
          console.warn('Session refresh error, redirecting to login:', refreshError);
          authClient.redirectToLogin();
          return Promise.reject(refreshError);
        }
      }

      // Token exists but not expired, or no token - likely insufficient permissions
      // Don't redirect, let the component handle the 401 error appropriately
      return Promise.reject(error);
    }

    // For other errors or already retried requests, just reject
    return Promise.reject(error);
  },
);
```

### Step 6: Type-Safe API Request Wrapper

```typescript
// lib/api/client.ts (continued)

/**
 * Type-safe API request wrapper
 *
 * Provides better TypeScript inference for API calls
 */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}
```

### Key Features

**Security Best Practices:**
- ✅ **No localStorage**: Tokens stored in memory only (mitigates XSS)
- ✅ **Better Auth Integration**: Uses `authClient.client.token()` for session management
- ✅ **Token Caching**: In-memory cache avoids fetching token on every request
- ✅ **Expiration Checking**: Uses `jose` to decode JWT and check expiration (60s buffer)
- ✅ **Smart Refresh**: Only fetches new token when cached token is expired
- ✅ **Automatic Retry**: On 401 with expired token, refreshes and retries request once
- ✅ **Permission Awareness**: Distinguishes expired tokens vs insufficient permissions
- ✅ **Infinite Loop Prevention**: `_retry` flag prevents retry loops
- ✅ **CSRF Protection**: `withCredentials: true` enables cookies

**Performance Optimization:**
- Token caching reduces unnecessary auth server calls
- 60-second expiration buffer prevents last-minute failures
- Single refresh attempt per request (no retry storms)
- Session checks only happen during API calls (not continuous polling)

---

## API Declarations Pattern

### Task Templates API

```typescript
import { apiClient } from '@/lib/api-client';
import type {
  TaskTemplateDto,
  CreateTaskTemplateDto,
  UpdateTaskTemplateDto,
  PaginatedResponse,
} from '@eridu/api-types';

// Query Keys Factory
export const taskTemplateKeys = {
  all: ['task-templates'] as const,
  lists: () => [...taskTemplateKeys.all, 'list'] as const,
  list: (studioId: string, filters: string) =>
    [...taskTemplateKeys.lists(), studioId, filters] as const,
  details: () => [...taskTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskTemplateKeys.details(), id] as const,
};

// API Functions
export async function getTaskTemplates(
  studioId: string,
  params?: {
    name?: string;
    cursor?: string;
    limit?: number;
  }
) {
  const { data } = await apiClient.get<PaginatedResponse<TaskTemplateDto>>(
    `/studios/${studioId}/task-templates`,
    { params }
  );
  return data;
}

export async function getTaskTemplate(studioId: string, templateId: string) {
  const { data } = await apiClient.get<TaskTemplateDto>(
    `/studios/${studioId}/task-templates/${templateId}`
  );
  return data;
}

export async function createTaskTemplate(
  studioId: string,
  payload: CreateTaskTemplateDto
) {
  const { data } = await apiClient.post<TaskTemplateDto>(
    `/studios/${studioId}/task-templates`,
    payload
  );
  return data;
}

export async function updateTaskTemplate(
  studioId: string,
  templateId: string,
  payload: UpdateTaskTemplateDto
) {
  const { data } = await apiClient.put<TaskTemplateDto>(
    `/studios/${studioId}/task-templates/${templateId}`,
    payload
  );
  return data;
}

export async function deleteTaskTemplate(studioId: string, templateId: string) {
  await apiClient.delete(`/studios/${studioId}/task-templates/${templateId}`);
}
```

### Users API

```typescript
import { apiClient } from '@/lib/api-client';
import type { UserDto, UpdateUserDto } from '@eridu/api-types';

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  detail: (id: string) => [...userKeys.all, id] as const,
};

export async function getCurrentUser() {
  const { data } = await apiClient.get<UserDto>('/users/me');
  return data;
}

export async function updateCurrentUser(payload: UpdateUserDto) {
  const { data } = await apiClient.put<UserDto>('/users/me', payload);
  return data;
}

export async function getUser(userId: string) {
  const { data } = await apiClient.get<UserDto>(`/users/${userId}`);
  return data;
}
```

---

## TanStack Query Integration

### Query Hooks

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTaskTemplates,
  getTaskTemplate,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  taskTemplateKeys,
} from '../api/task-templates.api';
import type { CreateTaskTemplateDto, UpdateTaskTemplateDto } from '@eridu/api-types';
import { toast } from 'sonner';

// List query
export function useTaskTemplates(studioId: string, filters: { name?: string }) {
  return useQuery({
    queryKey: taskTemplateKeys.list(studioId, JSON.stringify(filters)),
    queryFn: () => getTaskTemplates(studioId, filters),
  });
}

// Detail query
export function useTaskTemplate(studioId: string, templateId: string) {
  return useQuery({
    queryKey: taskTemplateKeys.detail(templateId),
    queryFn: () => getTaskTemplate(studioId, templateId),
    enabled: !!templateId,
  });
}

// Create mutation
export function useCreateTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskTemplateDto) =>
      createTaskTemplate(studioId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskTemplateKeys.lists() });
      toast.success('Template created successfully');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });
}

// Update mutation
export function useUpdateTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateTaskTemplateDto;
    }) => updateTaskTemplate(studioId, templateId, data),
    onMutate: async ({ templateId, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: taskTemplateKeys.detail(templateId),
      });

      const previous = queryClient.getQueryData(
        taskTemplateKeys.detail(templateId)
      );

      queryClient.setQueryData(taskTemplateKeys.detail(templateId), (old: any) => ({
        ...old,
        ...data,
      }));

      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          taskTemplateKeys.detail(variables.templateId),
          context.previous
        );
      }
      toast.error('Failed to update template');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskTemplateKeys.lists() });
      queryClient.setQueryData(taskTemplateKeys.detail(variables.templateId), data);
      toast.success('Template updated successfully');
    },
  });
}

// Delete mutation
export function useDeleteTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteTaskTemplate(studioId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskTemplateKeys.lists() });
      toast.success('Template deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });
}
```

### Infinite Query Hook

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTaskTemplates, taskTemplateKeys } from '../api/task-templates.api';

export function useInfiniteTaskTemplates(
  studioId: string,
  filters: { name?: string }
) {
  return useInfiniteQuery({
    queryKey: taskTemplateKeys.list(studioId, JSON.stringify(filters)),
    queryFn: ({ pageParam }) =>
      getTaskTemplates(studioId, {
        ...filters,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
  });
}
```

---

## File Upload API

```typescript
import { apiClient } from '@/lib/api-client';
import type { FileUploadDto } from '@eridu/api-types';

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<FileUploadDto>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress?.(progress);
      }
    },
  });

  return data;
}

// Usage with mutation
export function useFileUpload() {
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, setProgress),
    onSuccess: () => {
      toast.success('File uploaded successfully');
      setProgress(0);
    },
    onError: () => {
      toast.error('Failed to upload file');
      setProgress(0);
    },
  });

  return { ...mutation, progress };
}
```

---

## Polling Pattern

```typescript
import { useQuery } from '@tanstack/react-query';
import { getTaskStatus } from '../api/tasks.api';

export function useTaskStatus(taskId: string) {
  return useQuery({
    queryKey: ['task-status', taskId],
    queryFn: () => getTaskStatus(taskId),
    refetchInterval: (data) => {
      // Stop polling when task is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      // Poll every 2 seconds
      return 2000;
    },
  });
}
```

---

## Dependent Queries

```typescript
import { useQuery } from '@tanstack/react-query';
import { getStudio } from '../api/studios.api';
import { getStudioMembers } from '../api/members.api';

export function useStudioWithMembers(studioId: string) {
  // First query: Get studio
  const studioQuery = useQuery({
    queryKey: ['studio', studioId],
    queryFn: () => getStudio(studioId),
  });

  // Second query: Get members (only runs after studio is loaded)
  const membersQuery = useQuery({
    queryKey: ['studio-members', studioId],
    queryFn: () => getStudioMembers(studioId),
    enabled: !!studioQuery.data,  // Only run when studio is loaded
  });

  return {
    studio: studioQuery.data,
    members: membersQuery.data,
    isLoading: studioQuery.isLoading || membersQuery.isLoading,
    isError: studioQuery.isError || membersQuery.isError,
  };
}
```

---

## Parallel Queries

```typescript
import { useQueries } from '@tanstack/react-query';
import { getTaskTemplate } from '../api/task-templates.api';

export function useMultipleTaskTemplates(
  studioId: string,
  templateIds: string[]
) {
  const queries = useQueries({
    queries: templateIds.map((templateId) => ({
      queryKey: ['task-template', templateId],
      queryFn: () => getTaskTemplate(studioId, templateId),
    })),
  });

  return {
    templates: queries.map((q) => q.data).filter(Boolean),
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
  };
}
```
