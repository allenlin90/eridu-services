---
name: frontend-error-handling
description: Provides error handling patterns for React applications. This skill should be used when implementing error boundaries, API error interceptors, error tracking, or user-friendly error messages.
---

# Frontend Error Handling

This skill provides patterns for handling errors in React applications.

## Canonical Examples

Study these real implementations:
- **API Client Interceptor**: [client.ts](../../../apps/erify_studios/src/lib/api/client.ts)
- **Route Error Handler**: [route-error.tsx](../../../apps/erify_studios/src/components/route-error.tsx)

---

## Error Handling Layers

### 1. API Client Interceptor (Global)

Handle auth errors and network errors globally:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    }
    
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);
```

### 2. Route-Level Error Handling (TanStack Router — Primary Pattern)

TanStack Router renders the route's `errorComponent` when a loader or component throws. This is the **primary** error boundary for route-level failures — use it before reaching for a manual class-based boundary.

```typescript
// Route definition
export const Route = createFileRoute('/studios/$studioId/tasks')({
  component: TasksPage,
  errorComponent: RouteError,  // <── project-wide shared component
});
```

The shared `RouteError` component lives at [route-error.tsx](../../../apps/erify_studios/src/components/route-error.tsx).

### 2b. Error Boundaries (Subtree Fallback)

For subtrees inside a route that need isolated error containment, use the `react-error-boundary` package:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function TaskListSection() {
  return (
    <ErrorBoundary fallback={<p className="text-destructive">Failed to load tasks.</p>}>
      <TaskList />
    </ErrorBoundary>
  );
}
```

Avoid writing class-based `ErrorBoundary` implementations from scratch — `react-error-boundary` handles the class component requirement internally and is React 19-compatible.

### 3. TanStack Query Error Handling

**Global Mutation Toasts (Centralized via `MutationCache`)**:
The project uses a `MutationCache` `onError` callback in `query-client.ts` to automatically toast errors for all mutations.

- **Rule**: Do NOT implement inline `onError: (error) => toast.error(...)` inside `useMutation` hooks. Rely on the global handler.

#### Type-safe meta via `Register` (TanStack Query v5)

Custom meta fields are declared via module augmentation of the `Register` interface. This provides IDE autocomplete for `meta.suppressErrorToast` and `meta.errorMessage`.

```typescript
// query-client.ts
declare module '@tanstack/react-query' {
  // eslint-disable-next-line -- module augmentation requires interface
  interface Register {
    defaultError: Error;
    mutationMeta: {
      suppressErrorToast?: boolean;
      errorMessage?: string;
    };
  }
}
```

> **Important**: TanStack Query v5 infers `MutationMeta` from `Register.mutationMeta`. Do NOT declare a separate `interface MutationMeta` — it causes a "Duplicate identifier" TypeScript error.

#### Controlling global toast behavior

```typescript
// Default: global toast fires automatically on error (no extra code needed)
useMutation({ mutationFn: createTask });

// Suppress the toast entirely (e.g. background autosave)
useMutation({ mutationFn: saveTask, meta: { suppressErrorToast: true } });

// Custom toast message
useMutation({ mutationFn: deleteTask, meta: { errorMessage: 'Failed to delete task' } });
```

#### Dynamic suppression for autosave mutations

Mutations that accept a `silent` flag in their variables automatically suppress the global toast:

```typescript
// The global MutationCache handler checks variables.silent
mutate({ taskId, data, silent: true }); // ← no toast
mutate({ taskId, data });               // ← toast fires on error
```

#### Per-query error handling (component-level)

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
});

if (isError) {
  return <ErrorState message={error.message} />;
}
```

### 4. Form Validation Errors

Handle validation errors from Zod:

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const form = useForm({
  resolver: zodResolver(createTaskSchema),
});

// Errors automatically shown via form.formState.errors
<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />  {/* Shows validation error */}
    </FormItem>
  )}
/>
```

---

## Error Display Patterns

### Toast Notifications (Transient Errors)

```typescript
import { toast } from 'sonner';

// Success
toast.success('Task created successfully');

// Error
toast.error('Failed to create task');

// Warning
toast.warning('This action cannot be undone');
```

### Inline Error Messages (Form Errors)

```tsx
{error && <p className="text-sm text-destructive">{error.message}</p>}
```

### Error States (Component-level)

```tsx
if (isError) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold">Failed to load data</h3>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={() => refetch()} className="mt-4">Try again</Button>
    </div>
  );
}
```

---

## Best Practices Checklist

- [ ] API client has response interceptor for auth/network errors
- [ ] Error boundaries wrap route components
- [ ] TanStack Query has global error handlers
- [ ] Form validation uses Zod with react-hook-form
- [ ] Toast notifications for transient errors
- [ ] Inline error messages for form fields
- [ ] Error states for failed queries
- [ ] Retry buttons for recoverable errors
- [ ] User-friendly error messages (no stack traces)

---

## Related Skills

- [frontend-api-layer](../frontend-api-layer/SKILL.md) - API client setup
- [data-validation](../data-validation/SKILL.md) - Validation patterns
