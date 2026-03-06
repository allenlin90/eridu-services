---
name: frontend-testing-patterns
description: Provides comprehensive testing strategies and patterns for React applications. This skill should be used when writing tests, setting up testing infrastructure, or deciding what to test.
---

# Frontend Testing Patterns

This skill provides patterns for testing React applications using Vitest and React Testing Library.

## Canonical Examples

Study these real implementations:
- **Component Test**: [task-template-card.test.tsx](../../../apps/erify_studios/src/features/task-templates/components/__tests__/task-template-card.test.tsx)
- **Hook Test**: [use-task-templates.test.tsx](../../../apps/erify_studios/src/features/task-templates/hooks/__tests__/use-task-templates.test.tsx)

---

## Testing Pyramid

```
E2E Tests (Few)           ← Playwright (critical user flows)
Integration Tests (Some)  ← React Testing Library (component + hooks)
Unit Tests (Many)         ← Vitest (utilities, helpers)
```

---

## Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskCard } from './task-card';

describe('TaskCard', () => {
  it('renders task name', () => {
    const task = { uid: '1', name: 'Test Task', status: 'pending' };
    render(<TaskCard task={task} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const task = { uid: '1', name: 'Test Task', status: 'pending' };
    
    render(<TaskCard task={task} onEdit={onEdit} />);
    
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(task);
  });
});
```

**Key Points**:
- ✅ Use `screen` queries (not destructured `getBy*`)
- ✅ Test user behavior, not implementation
- ✅ Use `userEvent` for interactions (not `fireEvent`)

---

## Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { useTaskTemplates } from './use-task-templates';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTaskTemplates', () => {
  it('fetches task templates', async () => {
    const { result } = renderHook(() => useTaskTemplates('studio_123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });
});
```

---

## API Mocking (MSW)

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/tasks', () => {
    return HttpResponse.json({
      data: [{ uid: '1', name: 'Task 1' }],
      meta: { total: 1 },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## What to Test

### ✅ DO Test

- User interactions (clicks, typing, form submissions)
- Conditional rendering (loading, error, empty states)
- Accessibility (ARIA labels, keyboard navigation)
- Integration with hooks and context
- Edge cases and error scenarios
- Route search-param behavior (page, filters, date) when URL state drives data fetching

### ❌ DON'T Test

- Implementation details (state variables, function names)
- Third-party library internals
- Styling (use visual regression tests instead)
- Trivial code (getters, setters)

---

## Best Practices Checklist

- [ ] Component tests use React Testing Library
- [ ] Hook tests use `renderHook` with proper wrappers
- [ ] API calls mocked with MSW
- [ ] Tests focus on user behavior, not implementation
- [ ] Accessibility tested (ARIA, keyboard navigation)
- [ ] Loading/error/empty states tested
- [ ] User interactions use `userEvent` (not `fireEvent`)
- [ ] Async operations use `waitFor` or `findBy*` queries
- [ ] Refactor parity tests cover route-state behavior (pagination clamp timing, date/query defaults, and navigation callbacks)

## Refactor Parity Suite (Route Decomposition)

When decomposing a large route component, add or update tests that confirm no behavioral regression:

1. Loading/empty/data state rendering still matches previous behavior.
2. Search-param-driven behavior is preserved (`page`, `limit`, `date`, filter params).
3. Pagination clamping happens only after data is available, not during initial loading.
4. Route actions (previous/next page, date navigation) still update URL state correctly.

---

## Related Skills

- [frontend-ui-components](../frontend-ui-components/SKILL.md) - Component patterns
- [frontend-api-layer](../frontend-api-layer/SKILL.md) - API integration
