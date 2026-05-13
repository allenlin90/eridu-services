# Tech Debt: Admin Route Business Logic Bypass

## Current Issue

Some `/admin/*` mutation routes can write through broad orchestration or nested create paths that do not exercise the same business-specific write helpers used by studio workflow routes.

The active example is `POST /admin/shows`: nested creator assignment creation can persist `ShowCreator` rows without the same snapshot-readiness handling used by the bulk and replace assignment paths.

## Why It Matters

Admin routes are trusted support surfaces, but they still create durable production records. When they bypass domain write helpers, records can miss side effects such as audit metadata, snapshot readiness markers, lifecycle transitions, scoped validation, or cross-domain consistency checks.

For economics, reads must not depend only on `metadata.flags.agreement_snapshot_missing`. The calculator should derive unresolved state from the required snapshot fields and may use the flag as an explanatory marker when present.

## Desired Direction

- Route business-sensitive admin mutations through the same domain or orchestration service methods as studio workflows.
- Keep admin-only authority and support scope at the controller boundary; keep domain invariants inside services.
- Treat nested Prisma creates in admin flows as suspect when the child entity has its own lifecycle, audit trail, snapshot fields, or downstream read-model impact.
- Add tests for the admin path whenever a studio path has required side effects.

## Trigger To Fix

Fix this before or during any PR that changes:

- show creator assignment creation or editing;
- compensation snapshot fields;
- actual timestamp write behavior;
- economics read-model inputs;
- admin show create/update behavior;
- any other admin mutation with domain side effects beyond the parent row.

## Acceptance Criteria

- Admin and studio mutation paths produce equivalent business side effects for the same domain write.
- Snapshot-readiness handling is centralized so `ShowCreator` assignment creates and restores cannot silently diverge.
- Economics read tests cover missing snapshot fields regardless of whether the marker flag is present.
