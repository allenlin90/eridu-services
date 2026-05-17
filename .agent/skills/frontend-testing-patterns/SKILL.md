---
name: frontend-testing-patterns
description: Provides comprehensive testing strategies and patterns for React applications. This skill should be used when writing tests, setting up testing infrastructure, or deciding what to test.
---

# Frontend Testing Patterns

Testing patterns for React applications. **Test runner**: Vitest (not Jest).

> See [references/testing-examples.md](references/testing-examples.md) for detailed code examples.

## Canonical Examples

- **Component Test**: [task-template-card.test.tsx](../../../apps/erify_studios/src/features/task-templates/components/__tests__/task-template-card.test.tsx)
- **Hook Test**: [use-task-templates.test.tsx](../../../apps/erify_studios/src/features/task-templates/hooks/__tests__/use-task-templates.test.tsx)

## Testing Pyramid

```
E2E Tests (Few)           ← Playwright
Integration Tests (Some)  ← React Testing Library
Unit Tests (Many)         ← Vitest
```

## Key Rules

- Use `screen` queries (not destructured `getBy*`)
- Test user behavior, not implementation
- Use `userEvent` for interactions (not `fireEvent`)
- Use `waitFor`/`findBy*` for async operations
- Mock APIs with MSW (`setupServer`)
- Wrap hooks in `QueryClientProvider` via `createWrapper()`

## What to Test / Skip

| ✅ Test | ❌ Skip |
|---|---|
| User interactions | Implementation details |
| Conditional rendering (loading/error/empty) | Third-party internals |
| Accessibility (ARIA, keyboard) | Styling |
| Hook + context integration | Trivial code |
| Edge cases and errors | |
| Route search-param behavior | |

## Refactor Parity Suite

When decomposing a large route component, verify:
1. Loading/empty/data states unchanged
2. Search-param behavior preserved
3. Pagination clamping only after data available
4. Route actions still update URL state correctly

## Checklist

- [ ] Component tests use Testing Library
- [ ] Hook tests use `renderHook` with proper wrappers
- [ ] API calls mocked with MSW
- [ ] Tests focus on user behavior
- [ ] Accessibility tested
- [ ] All states (loading/error/empty) tested
- [ ] `userEvent` for interactions
- [ ] Refactor parity tests for route decomposition

## Related Skills

- [frontend-ui-components](../frontend-ui-components/SKILL.md) — Component patterns
- [backend-testing-patterns](../backend-testing-patterns/SKILL.md) — Jest contrast
