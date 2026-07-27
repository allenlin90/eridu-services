---
name: studio-creator-onboarding-patterns
description: Studio Creator Onboarding (PR #32, merged) — separate from roster CRUD PR #30; onboardCreator transaction, UX split, schema patterns
metadata:
  type: project
---

- `StudioCreatorService.onboardCreator` is `@Transactional()`. Both `CreatorService.createCreator` and
  `StudioCreatorRepository.createRosterEntry` use `txHost.tx` internally so they participate correctly.
- `UserRepository.searchUsersForCreatorOnboarding` uses `this.model.findMany` (PrismaModelWrapper backed by static
  `prisma.user`) — read-only, never called inside a transaction, acceptable.
- `onboardCreatorInputSchema` in `@eridu/api-types` re-uses `studioCreatorRosterDefaultsInputSchema` (private base
  schema) for the `roster` sub-object — enforces compensation validation in the shared package layer, not duplicated.
- `userUidSchema` validates `user_id` starts with `'user_'` (literal, not the `UID_PREFIXES` constant) — intentional,
  user UIDs use a fixed prefix not derived from the shared enum.
- Two separate action buttons in the roster table toolbar: "Onboard Creator" (new global identity) vs "Add Creator"
  (existing from catalog) — deliberate UX split diverging from the design doc's single "Add Creator" flow, but
  consistent with the SOLID split into `OnboardCreatorDialog` + `AddStudioCreatorDialog`.
- `BulkCreatorAssignmentDialog.onSuccess` prop type stays `() => void` (no args); the internal
  `useBulkAssignCreatorsToShows.onSuccess` receives the full response and decides internally whether to call the
  prop's `onSuccess`. Correct layering.
- `show-orchestration.service.ts`: `existingAssignment` (already-active) check comes BEFORE the roster check so
  idempotent re-assignment of a previously-assigned creator is always skipped, even if that creator later left the
  roster. Intentional.
- Schema spec file `studio-creator-onboard.schema.spec.ts` lives under
  `apps/erify_api/src/studios/studio-creator/schemas/` but tests `@eridu/api-types` schemas — non-standard but
  accepted, co-locates validation tests near the DTO that consumes them.
- `OnboardStudioCreatorDto` uses `.transform()` in `createZodDto()` to convert snake_case wire format to camelCase;
  the controller re-reads `dto.creator.name`, `dto.creator.aliasName` (already camelCase) — correct, `declare` fields
  reflect the post-transform shape.
