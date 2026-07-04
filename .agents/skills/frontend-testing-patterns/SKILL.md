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

## Characterize Before You Split

Before decomposing a giant that has **no colocated test**, write a characterization test that pins its current, non-obvious behavior — the rules that aren't visible from the JSX (e.g. "changing the type resets the default value and reshapes the validation payload", "binding X forces rule Y"). Assert through the public surface (rendered controls → emitted `onChange`/`onUpdate` payloads), not internals. The test must be green against the **original** file first; keeping it green against the split is the proof the refactor preserved behavior. Without this, an untested giant has no safety net and "behavior-preserving" is an unverified claim.

## happy-dom Gotcha: Radix Select

Radix `Select` opens its listbox via pointer-capture APIs happy-dom doesn't implement, so `userEvent.click` on a `SelectTrigger` throws `target.hasPointerCapture is not a function`. Polyfill locally in the test file (not shared setup) when you need to drive a real `onValueChange`:

```ts
beforeAll(() => {
  const p = window.HTMLElement.prototype;
  p.hasPointerCapture = () => false;
  p.setPointerCapture = () => {};
  p.releasePointerCapture = () => {};
  p.scrollIntoView = () => {};
});
```

Popover+Command comboboxes (button trigger) don't need this — only Radix `Select`. To target a `Select` with no associated label, scope by its labeled group: `within(screen.getByText('<Label>').closest('div')).getByRole('combobox')`.

## Testing a Route Split by TanStack's `lazyRouteComponent`

When a route's page component is intentionally not a named export (so `autoCodeSplitting` moves it into its own lazy chunk instead of the eager entry — see `frontend-bundle-splitting`'s TanStack Router section), a test can no longer `import { MyPage } from './route-file'`. Read it off the route instead: `const MyPage = Route.component`, matching the reference the real router renders.

If the test mocks `@tanstack/react-router` wholesale (a common pattern for isolating route tests from the real router), give `lazyRouteComponent` a real implementation instead of a bare `vi.fn()` — a `vi.fn()` returns `undefined`, so `Route.component` renders `undefined` and React throws "Element type is invalid." Mirror what the real plugin generates:

```ts
lazyRouteComponent: (importer: () => Promise<any>, exportName = 'default') =>
  React.lazy(async () => ({ default: (await importer())[exportName] })),
```

Since the component is now a real `React.lazy` reference, tests must render it inside `<Suspense fallback={null}>` and use `findBy*`/`waitFor` (not `getBy*`) for the **first** assertion after each render — the dynamic import resolves on a later microtask, not synchronously. Subsequent assertions in the same test can stay `getBy*` once the component has resolved. Bump the `findBy*`/`findAllByRole` timeout explicitly (e.g. `{ timeout: 5000 }`) rather than relying on the ~1000ms default — a real dynamic import through Vitest's transform pipeline can occasionally exceed the default under full-suite parallel load even though it resolves quickly in isolation; this showed up as an intermittent failure only when running the whole suite, not the single file.

## Checklist

- [ ] Component tests use Testing Library
- [ ] Hook tests use `renderHook` with proper wrappers
- [ ] API calls mocked with MSW
- [ ] Tests focus on user behavior
- [ ] Accessibility tested
- [ ] All states (loading/error/empty) tested
- [ ] `userEvent` for interactions
- [ ] Refactor parity tests for route decomposition
- [ ] Untested giant gets a characterization test (green on the original) before any split

## Related Skills

- [frontend-ui-components](../frontend-ui-components/SKILL.md) — Component patterns
- [backend-testing-patterns](../backend-testing-patterns/SKILL.md) — Jest contrast
- [frontend-bundle-splitting](../frontend-bundle-splitting/SKILL.md) — why a route's page component ends up un-exported in the first place
