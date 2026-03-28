# Creator Availability Hardening Frontend Design

> **Status**: Planning
> **Phase scope**: Phase 4 Wave 2
> **Owner app**: `apps/erify_studios`
> **Product source**: [`docs/prd/creator-availability-hardening.md`](../../../../docs/prd/creator-availability-hardening.md)
> **Depends on**: Studio creator roster shipped 🔲

## Purpose

Integrate strict availability feedback into creator assignment flows without regressing the current search-first discovery UX.

## Flow Plan

- Discovery/search step keeps `strict=false` for broad creator lookup.
- Confirmation/assignment step requests `strict=true&show_id=...` so the UI can surface conflict metadata before save.
- Assignment write errors remain authoritative and must map to typed toasts/messages.

## Query / State Plan

- Reuse the existing availability query family with a strict-mode branch keyed by `show_id`, `strict`, and `include_inactive`.
- Refetch strict-mode availability when the assignment target show changes.
- Invalidate relevant availability queries after successful assignment mutation.

## UI Plan

- Show `OVERLAP`, `NOT_IN_ROSTER`, and `INACTIVE` badges/warnings in strict mode.
- Support disabled or warned CTA states without hiding the creator from discovery results.
- Preserve same-show re-assignment flows as non-conflicted update paths.

## UX Rules

- Default UX stays loose; hard enforcement happens at confirmation/write time.
- Error copy must distinguish conflict/eligibility failures from authz or not-found states.
- `include_inactive=true` is an explicit operator action, not the default browse mode.

## Verification

- `pnpm --filter erify_studios lint`
- `pnpm --filter erify_studios typecheck`
- `pnpm --filter erify_studios build`
- `pnpm --filter erify_studios test`
- Manual smoke: loose browse, strict confirm, overlap badge, inactive include, write-time conflict handling

