# Tech Debt: Studio↔Client Linkage Gate Is Unvalidated Against Real Multi-Studio Data

## Current Issue

`ensureStudioClientLinkage` (`StudioClientMechanicController`, `StudioTaskTemplateController`) gates client-mechanic catalog and template-binding writes by counting non-deleted `Show` rows for the `(studioId, clientId)` pair — `count > 0` means linked. Today there is exactly one studio, and it runs shows for every client the platform serves, so this check is **trivially always true**: every call passes, regardless of which client is named. It has never been exercised against a case where it should actually deny.

## Why It Matters

The check derives "is this studio linked to this client" from existing show data instead of a dedicated relationship table — the right call to avoid modeling a relationship with no second side to validate it against (see [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md) B2). But "derived from existing data" carries an implicit assumption that's never been tested: that a studio always has at least one `Show` row for a client before it needs catalog/template access for that client. With one studio serving everyone, that assumption can't fail. With a second studio, it might — e.g. if onboarding ever needs a studio to author a client's mechanics or bind a template before the first `Show` for that pairing is scheduled, the gate would incorrectly deny rather than allow.

This is not a code defect to fix now — there's nothing wrong with the logic given today's data. It's a design assumption that has zero real-world coverage and needs verifying the moment it matters.

## Desired Direction

When a second studio is onboarded:
- Confirm the actual onboarding sequence: does the studio get its first `Show` row for a new client before or after it needs catalog/template access for that client?
- If "before" always holds, no change needed — the existing gate is correct as-is.
- If "after" can happen (e.g. catalog setup precedes the first scheduled show), either relax the gate for an initial setup window, or make the onboarding flow itself create a placeholder/draft `Show` first so the existing signal stays accurate without new modeling.

## Trigger To Fix

Revisit when a second studio is onboarded — before that studio's account managers or admins need client-mechanic or template-binding access for any client whose first `Show` with that studio doesn't exist yet.

## Related Context

- [CLIENT_MECHANICS_MANAGEMENT_DESIGN.md](../../apps/erify_studios/docs/design/CLIENT_MECHANICS_MANAGEMENT_DESIGN.md) — B2 decision
- `studio-client-mechanic.controller.ts` / `studio-task-template.controller.ts` — `ensureStudioClientLinkage`
- [PHASE_6.md](../roadmap/PHASE_6.md) Track D — Client operations portal (likely owns the real studio-client relationship model if/when it's needed)
