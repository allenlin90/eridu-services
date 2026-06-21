# Tech Debt: Studio↔Client Linkage Gate Is Unvalidated Against Real Multi-Studio Data

## Current Issue

`ensureStudioClientLinkage` (`StudioClientMechanicController`, `StudioTaskTemplateController`) gates client-mechanic catalog and template-binding writes by counting non-deleted `Show` rows for the `(studioId, clientId)` pair — `count > 0` means linked. Today there is exactly one studio, and it runs shows for every client the platform serves, so this check is **trivially always true**: every call passes, regardless of which client is named. It has never been exercised against a case where it should actually deny.

Two distinct timing gaps follow from deriving "linked" from `Show` existence instead of an explicit relationship:

1. **Before the relationship has a `Show` yet** — covered below.
2. **After the relationship has ended** — linkage is a one-way ratchet. The query has no date bound and no "is this relationship still active" concept: a single `Show` from any point in history, even one long past and never repeated, keeps the studio permanently "linked" to that client. There's no way to *unlink* a studio from a client short of soft-deleting every `Show` row that ever paired them. If client relationships are ever reassigned between studios (e.g. a client moves from Studio A to Studio B), Studio A stays able to write that client's mechanic catalog and bind templates to it forever, with no signal that the relationship has lapsed.

## Why It Matters

The check derives "is this studio linked to this client" from existing show data instead of a dedicated relationship table — the right call to avoid modeling a relationship with no second side to validate it against (see [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md) B2). But "derived from existing data" carries two implicit assumptions that have never been tested:

- A studio always has at least one `Show` row for a client *before* it needs catalog/template access for that client (the onboarding-sequencing gap).
- A studio that was once linked to a client should *stay* linked to it indefinitely, even after the relationship ends (the ratchet gap).

With one studio serving everyone, neither assumption can fail — there's no second studio to ever revoke access from, and no real precedent for client relationships moving between studios. With a second studio, either could.

This is not a code defect to fix now — there's nothing wrong with the logic given today's data. It's two design assumptions with zero real-world coverage that need verifying the moment they matter.

## Desired Direction

When a second studio is onboarded:
- Confirm the actual onboarding sequence: does the studio get its first `Show` row for a new client before or after it needs catalog/template access for that client?
- If "before" always holds, no change needed — the existing gate is correct as-is for onboarding.
- If "after" can happen (e.g. catalog setup precedes the first scheduled show), either relax the gate for an initial setup window, or make the onboarding flow itself create a placeholder/draft `Show` first so the existing signal stays accurate without new modeling.
- Confirm whether client↔studio reassignment is a real product scenario. If it is, the ratchet gap needs an explicit fix (e.g. bound the `Show` lookup to a recency window, or introduce the dedicated relationship model PHASE_6 Track D anticipates) before a studio that's lost a client can be denied access again.

## Trigger To Fix

Revisit when a second studio is onboarded — before that studio's account managers or admins need client-mechanic or template-binding access for any client whose first `Show` with that studio doesn't exist yet, **and** before any client relationship is ever reassigned away from a studio that previously held it.

## Related Context

- [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md) — B2 decision
- `studio-client-mechanic.controller.ts` / `studio-task-template.controller.ts` — `ensureStudioClientLinkage`
- [PHASE_6.md](../roadmap/PHASE_6.md) Track D — Client operations portal (likely owns the real studio-client relationship model if/when it's needed)
