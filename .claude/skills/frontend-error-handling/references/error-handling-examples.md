# Frontend Error Handling - Code Examples

This file contains detailed error handling examples extracted from the main SKILL.md.

## Complete API Client with Error Interceptor

```typescript
import axios, { type AxiosError } from 'axios';
import { toast } from 'sonner';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      toast.error('Session expired. Please log in again.');
      return Promise.reject(error);
    }

    // Handle authorization errors
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
      return Promise.reject(error);
    }

    // Handle not found errors
    if (error.response?.status === 404) {
      toast.error('Resource not found');
      return Promise.reject(error);
    }

    // Handle validation errors
    if (error.response?.status === 422) {
      const message = error.response.data?.message || 'Validation failed';
      toast.error(message);
      return Promise.reject(error);
    }

    // Handle server errors
    if (error.response?.status && error.response.status >= 500) {
      toast.error('Server error. Please try again later.');
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    // Generic error
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);
    return Promise.reject(error);
  }
);
```

---

## Complete Error Boundary Component

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@eridu/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
          {import.meta.env.DEV && this.state.errorInfo && (
            <details className="mt-8 max-w-2xl w-full">
              <summary className="cursor-pointer text-sm font-medium">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
                {this.state.error?.stack}
                {'\n\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Using Error Boundary in Router

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from '@/components/error-boundary';

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  ),
});
```

---

## TanStack Query Error Handling

### Global Query Client Configuration

```typescript
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof AxiosError && error.response?.status && error.response.status < 500) {
          return false;
        }
        // Retry up to 3 times for 5xx errors
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        if (error instanceof AxiosError) {
          // Only show toast if not handled by interceptor
          if (error.response?.status && error.response.status >= 500) {
            toast.error(error.response?.data?.message || 'Failed to fetch data');
          }
        } else {
          toast.error('An unexpected error occurred');
        }
      },
    },
    mutations: {
      onError: (error) => {
        if (error instanceof AxiosError) {
          const message = error.response?.data?.message || 'Operation failed';
          toast.error(message);
        } else {
          toast.error('An unexpected error occurred');
        }
      },
    },
  },
});
```

### Per-Query Error Handling

```typescript
import { useQuery } from '@tanstack/react-query';
import { getTaskTemplates } from '../api/task-templates.api';
import { AlertCircle } from 'lucide-react';
import { Button } from '@eridu/ui';

export function TaskTemplatesList({ studioId }: { studioId: string }) {
  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: ['task-templates', studioId],
    queryFn: () => getTaskTemplates(studioId),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load templates</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
        <Button onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {data?.data.map((template) => (
        <TemplateCard key={template.uid} template={template} />
      ))}
    </div>
  );
}
```

### Mutation Error Handling with Optimistic Updates

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateTaskTemplate } from '../api/task-templates.api';

export function useUpdateTaskTemplate(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTaskTemplateDto }) =>
      updateTaskTemplate(studioId, templateId, data),
    
    onMutate: async ({ templateId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['task-templates', studioId] });

      // Snapshot previous value
      const previousTemplates = queryClient.getQueryData(['task-templates', studioId]);

      // Optimistically update
      queryClient.setQueryData(['task-templates', studioId], (old: any) => ({
        ...old,
        data: old.data.map((t: any) =>
          t.uid === templateId ? { ...t, ...data } : t
        ),
      }));

      return { previousTemplates };
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        queryClient.setQueryData(['task-templates', studioId], context.previousTemplates);
      }
      
      toast.error('Failed to update template');
    },

    onSuccess: () => {
      toast.success('Template updated successfully');
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['task-templates', studioId] });
    },
  });
}
```

---

## Form Validation Error Handling

### React Hook Form with Zod

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Button,
} from '@eridu/ui';

const createTaskTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
});

type CreateTaskTemplateFormData = z.infer<typeof createTaskTemplateSchema>;

export function CreateTaskTemplateForm({ onSubmit }: { onSubmit: (data: CreateTaskTemplateFormData) => void }) {
  const form = useForm<CreateTaskTemplateFormData>({
    resolver: zodResolver(createTaskTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter template name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter template description"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional description for this template
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create Template'}
        </Button>
      </form>
    </Form>
  );
}
```

### Server-side Validation Errors

```typescript
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { createTaskTemplate } from '../api/task-templates.api';

export function CreateTaskTemplateForm({ studioId }: { studioId: string }) {
  const form = useForm<CreateTaskTemplateFormData>();

  const mutation = useMutation({
    mutationFn: (data: CreateTaskTemplateFormData) => createTaskTemplate(studioId, data),
    onError: (error) => {
      if (error instanceof AxiosError && error.response?.status === 422) {
        // Handle validation errors from server
        const errors = error.response.data?.errors;
        if (errors) {
          Object.entries(errors).forEach(([field, messages]) => {
            form.setError(field as any, {
              type: 'server',
              message: Array.isArray(messages) ? messages[0] : messages,
            });
          });
        }
      }
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
      {/* Form fields */}
    </form>
  );
}
```

---

## Toast Notification Patterns

```typescript
import { toast } from 'sonner';

// Success
toast.success('Task template created successfully');

// Error
toast.error('Failed to create task template');

// Warning
toast.warning('This action cannot be undone');

// Info
toast.info('Template saved as draft');

// Promise (automatic loading/success/error states)
toast.promise(
  createTaskTemplate(studioId, data),
  {
    loading: 'Creating template...',
    success: 'Template created successfully',
    error: 'Failed to create template',
  }
);

// With action button
toast.error('Failed to save changes', {
  action: {
    label: 'Retry',
    onClick: () => handleRetry(),
  },
});

// Custom duration
toast.success('Changes saved', { duration: 2000 });
```
