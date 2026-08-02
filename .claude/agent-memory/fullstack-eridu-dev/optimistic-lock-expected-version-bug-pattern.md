---
name: optimistic-lock-expected-version-bug-pattern
description: A workflow service that re-fetches "current" for auth/state checks must pass the caller-supplied expected version separately — reusing current.version silently defeats optimistic locking. Real-DB tests catch this; mocked unit tests don't.
metadata:
  type: feedback
---

**The bug shape**: an orchestration/workflow service method does:

```ts
async updateThing(uid, dto) {
  const current = await this.thingService.getByUid(uid); // fresh read from DB
  ...
  return this.thingService.updateFields(current, { ...dto });
  // updateFields internally does: persistVersionedUpdate(current.uid, current.version, data)
}
```

This looks reasonable but is wrong: `current.version` is whatever the row's
version happens to be *right now* in the DB — not what the client last read
and is asserting against (`dto.version`, the client's optimistic-lock token).
Using `current.version` as both the read source and the write's expected
version makes the check tautological: it always matches (mod races within the
same call), so a client submitting a stale `dto.version` after someone else's
concurrent edit will silently succeed and clobber the intervening change
instead of getting a 409.

**Fix**: thread the caller-supplied expected version through as an explicit,
separate parameter from `current`:

```ts
async updateFields(current: Entity, expectedVersion: number, payload): Promise<Entity> {
  // current is only used for state-transition validation (status checks etc.)
  // expectedVersion (= dto.version from the client) is what the optimistic-lock
  // WHERE clause and the `version: expectedVersion + 1` write actually use.
  return this.persistVersionedUpdate(current.uid, expectedVersion, data);
}
```

And the workflow caller passes `dto.version` explicitly, not `issue.version`:
`this.showIssueService.updateShowIssueFields(issue, dto.version, {...})`.

**Why unit tests miss it**: a mocked-repository unit test constructs `current`
by hand to already match the version being asserted, so the bug is invisible —
there's no "someone else already bumped the version between read and write"
scenario to exercise. Only a real-Postgres integration test that does two
sequential real writes and then replays a stale client version catches it (the
extended-where-unique-input `{ uid, version, deletedAt: null }` WHERE clause
either matches or doesn't against the actual row).

**Regression test worth keeping** in the model-service unit spec once fixed:
assert the repository call uses `expectedVersion`, not `current.version`, when
the two differ (construct `current` with a version ahead of `expectedVersion`
to prove the caller's value wins).

Found on `ShowIssueService`/`ShowIssueWorkflowService` (Phase 5 item 9 manual
workflow, PR delivered 2026-08-01) via the guarded real-DB integration gate
(`pnpm -C apps/erify_api test:integration`) — see
[[show-issue-ownership-implementation]]. Worth checking for the same shape in
any other workflow-service `update*`/`resolve*`/`reopen*` method that re-fetches
"current" before writing.
