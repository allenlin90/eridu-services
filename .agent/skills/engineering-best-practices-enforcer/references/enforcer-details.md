# Engineering Best Practices Enforcer — Detailed References

Extended guidance for refactor impact protocol, review checklists, and implementation micro-decisions.

## Refactor Impact Protocol (Mandatory)

### Before Implementation
1. Define explicit refactor boundary: in-scope files, out-of-scope files, invariants that must not change
2. Create mini risk register: risk, trigger condition, mitigation, detection method
3. Prefer smallest viable batch for independent revert

### During Implementation
1. Refactor one axis at a time (state, data, rendering, side effects)
2. Preserve external contracts first; improve internal structure second
3. If shared component behavior is touched, add/adjust tests in same batch

### After Implementation
1. Run verification: lint, typecheck, test, build
2. Smoke checks: open primary page, open each dialog/sheet, execute key action path
3. Confirm no new console warnings/errors

## Frontend Paginated View Parity Check
- Identify nearest existing paginated route
- Compare: pagination ownership, query transition behavior, footer implementation
- Treat fallback clamps and custom state machines as blocking unless documented exception

## Backend Repository Review Checklist

### Method Proliferation
- Does any named method reduce to `findMany({ where: { field: value } })`? → Delete it
- Does any named method exist for a single caller? → Inline it
- Are `findActiveByX`, `findByStatus`, `findByStudioUid` present? → Evaluate necessity

### Soft-Delete Hygiene
- All custom queries filter `deletedAt: null`
- `BaseRepository.findMany` used where possible
- No raw `this.prisma.model.findMany` without guard

### ORM Leakage
- No `Prisma.*` types in service signatures
- No Prisma query building in services

### Error Handling
- Repository returns `null` for not-found (never throws)
- No `findByUidOrThrow` methods

## Implementation Micro-Decisions

### `useCallback` Decision Rule
Default: **don't use**. Use only when:
1. Passed to `React.memo` child causing measurable re-renders
2. Part of hook dependency semantics for correctness
3. Reused in multiple places for readability

### Derived Table State Memoization
Default: **don't memoize** small derived objects (`tablePagination`, `filters`). Use `useMemo` only when:
1. Derivation is computationally expensive
2. Proven churn issues from unstable references
3. Complete dependency coverage with regression test

### Null-Safety Guard Rule
- Never rely on `a?.x === b?.y` as guard before dereferencing
- First establish non-null guard, then dereference
- Helper functions accepting nullable must return safely on null/undefined
