---
name: frontend-error-handling
description: Provides error handling patterns for React applications. This skill should be used when implementing error boundaries, API error interceptors, error tracking, or user-friendly error messages.
---

# Frontend Error Handling

Error handling patterns for React applications.

> See [references/error-handling-examples.md](references/error-handling-examples.md) for detailed code examples.

## Canonical Examples

- **API Interceptor**: [client.ts](../../../apps/erify_studios/src/lib/api/client.ts)
- **Route Error**: [route-error.tsx](../../../apps/erify_studios/src/components/route-error.tsx)

## Error Handling Layers

### 1. API Client Interceptor (Global)
Handles auth errors (401 → redirect to login), permissions (403 → toast), network errors (no response → toast).

### 2. Route-Level Error (TanStack Router)
Primary error boundary. Use `errorComponent: RouteError` in route definitions. Shared component at `route-error.tsx`.

### 3. Subtree Error Boundaries
Use `react-error-boundary` package for isolated error containment. Never write class-based boundaries from scratch.

### 4. TanStack Query Error Handling
- **Global mutation toasts**: Centralized via `MutationCache` in `query-client.ts`
- 🔴 Do NOT add inline `onError: (error) => toast.error(...)` in `useMutation` hooks
- **Suppress**: `meta: { suppressErrorToast: true }` for background saves
- **Custom message**: `meta: { errorMessage: 'Failed to delete task' }`
- **Dynamic suppression**: `variables.silent` flag checks
- **Type-safe meta**: Via `Register` module augmentation (v5)

### 5. Form Validation
Zod + `zodResolver` + react-hook-form. Errors shown via `<FormMessage />`.

## Error Display Patterns

| Type | Pattern |
|---|---|
| Transient | `toast.success/error/warning` (Sonner) |
| Form fields | `<FormMessage />` inline |
| Component-level | `isError` → error state with retry button |

## Checklist

- [ ] API client has response interceptor for auth/network errors
- [ ] Route error component set on routes
- [ ] TanStack Query global mutation error handler
- [ ] Form validation with Zod + react-hook-form
- [ ] Toast notifications for transient errors
- [ ] Error states with retry buttons for failed queries
- [ ] User-friendly messages (no stack traces)

## Related Skills

- [frontend-api-layer](../frontend-api-layer/SKILL.md) — API client setup
- [data-validation](../data-validation/SKILL.md) — Validation patterns
