---
name: data-compatibility-migration
description: Frontend data compatibility and fallback patterns for API contract migrations. Use when building UI that must handle both old and new API response shapes during a cutover, or when centralizing field-access helpers for dual-field responses.
---

# Data Compatibility Migration

Patterns for safely consuming API responses that may contain old field names, new field names, or both during a domain cutover. Derived from the Phase 4 mc→creator frontend migration.

## When to Use

- Frontend must render data from an API that is mid-cutover (old and new field names coexist).
- Building fallback helpers to centralize dual-field access instead of scattering `??` chains.
- Deciding when to remove compatibility reads after cutover stabilization.

## Core Pattern: Centralized Fallback Helpers

Create a single utility file per domain that encapsulates all field-access logic:

```typescript
// src/lib/creator-utils.ts

export type CreatorIdentity = {
  id?: string | null;
  creator_id?: string | null;
  creator_name?: string | null;
  name?: string | null;
};

// Primary field first, legacy fallback second
export function getCreatorId(creator: CreatorIdentity): string | null {
  return creator.creator_id ?? creator.id ?? null;
}

export function getCreatorName(creator: CreatorIdentity): string | null {
  return creator.creator_name ?? creator.name ?? null;
}

// Collection accessor with empty-array default
export function getCreatorCollection(
  source: { creators?: CreatorIdentity[] | null } | null | undefined,
): CreatorIdentity[] {
  return source?.creators ?? [];
}
```

**Reference implementation**: `apps/erify_studios/src/lib/creator-utils.ts`

## Rules

### DO

1. **Centralize in one file per domain** — all components import from the same utility.
2. **Primary field first** — `creator_id ?? id`, never the reverse. The new name is canonical.
3. **Type the union loosely** — use optional fields with `| null` so the helper works with both old and new response shapes.
4. **Write tests for each accessor** — cover: only-new-field, only-old-field, both-present, neither-present.
5. **Use the helpers everywhere** — components never access `source.mc_name` directly; they call `getCreatorName(source)`.

### DON'T

1. **Don't scatter `??` fallback chains in components** — that's the whole point of centralizing.
2. **Don't add compatibility reads to new code** — new features written after cutover should only use canonical field names.
3. **Don't keep fallback helpers forever** — remove them in the stabilization scope (S4) once the API emits only canonical fields.

## Lifecycle

```
S2  Backend adds alias fields     → API emits both old and new field names
S3  Frontend uses fallback helpers → UI reads new-first, falls back to old
S4  Backend removes old aliases    → API emits only new field names
S4  Frontend removes fallback helpers → Direct field access, no helpers needed
```

After S4, the utility file should either be deleted or simplified to direct accessors without fallback logic.

## Testing Pattern

```typescript
describe('getCreatorId', () => {
  it('prefers creator_id over id', () => {
    expect(getCreatorId({ creator_id: 'cr_1', id: 'mc_1' })).toBe('cr_1');
  });

  it('falls back to id when creator_id is missing', () => {
    expect(getCreatorId({ id: 'mc_1' })).toBe('mc_1');
  });

  it('returns null when both are missing', () => {
    expect(getCreatorId({})).toBeNull();
  });
});
```

## Related Skills

- [domain-refactor-cutover-strategy](../domain-refactor-cutover-strategy/SKILL.md) — Overall cutover phasing and scope management.
- [frontend-api-layer](../frontend-api-layer/SKILL.md) — TanStack Query patterns for API consumption.
