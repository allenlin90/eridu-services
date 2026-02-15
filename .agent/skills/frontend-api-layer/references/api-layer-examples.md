# Frontend API Layer - Code Examples

This file contains detailed API layer examples extracted from the main SKILL.md.

## Complete API Client Setup

```typescript
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Create axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    if (config.headers) {
      config.headers['X-Request-ID'] = crypto.randomUUID();
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      toast.error('Session expired. Please log in again.');
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      toast.error('Resource not found');
    }

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);
```

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
