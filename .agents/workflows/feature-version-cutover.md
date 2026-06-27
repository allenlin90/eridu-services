---
description: Manual-trigger workflow for schema redesigns — decides whether to update feature docs in place or split into versioned v1/v2, and cross-checks all related docs/skills.
---

# Feature Version Cutover

Run this workflow **manually** when a schema redesign for a shipped feature reaches a cutover point. It is a specialization of [knowledge-sync.md](./knowledge-sync.md) for the specific case where the underlying contract is changing shape, not just being extended.

## When To Trigger

Trigger when **any** of these are true:

1. A new schema engine, storage-key strategy, or projection rule is being introduced for an already-shipped feature.
2. An ideation/PRD doc proposes a `v2` (or higher) for an existing feature.
3. Backwards-incompatible changes are landing that require coexistence of old and new shapes (e.g., dual readers, snapshot-pinned migrations).
4. An existing feature doc no longer accurately describes the shipped behavior because the schema has drifted underneath it.

Do **not** trigger for: additive field changes, label/UX-only changes, bug fixes that preserve the contract, or refactors that don't change wire/storage shape.

## Decision: Update In Place vs Version Split

Before any doc edits, decide which path applies:

| Signal                                                                                                 | Path                                                                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Change is additive; old contract still describes the system correctly with new fields documented       | **Update in place** (no split)                                           |
| Change rewrites storage keys, projection rules, or canonical-metric semantics                          | **Version split** (v1 archived)                                          |
| Old and new shapes will coexist in production (dual snapshots, mixed reads) for any non-trivial period | **Version split** (v1 archived)                                          |
| Migration is a one-time hard cutover with no historical readers                                        | **Update in place** after cutover; archive v1 only if useful for context |

If unsure, default to **version split** — separating shapes is cheaper than untangling a doc that conflates them later.

## Path A: Update In Place

1. Identify the feature's canonical artifact list (the `Maintenance: Documentation Sync` section of the feature doc).
2. Update each artifact in the same PR as the schema change. No follow-ups.
3. Cross-check that no artifact still describes the old shape verbatim.
4. Run [knowledge-sync.md](./knowledge-sync.md) completion checklist.

## Path B: Version Split

1. **Promote the feature doc to a folder** (if it isn't already):
   - `docs/features/<feature>.md` → `docs/features/<feature>/README.md`
   - Update `docs/features/README.md` index entry to point at the folder path.
   - Update every external link that referenced the old flat path (search for `features/<feature>.md`).

2. **Freeze v1**:
   - Copy the current `README.md` content to `docs/features/<feature>/v1.md`.
   - Add a header to `v1.md`:
     ```markdown
     > **Status**: Retired YYYY-MM-DD — superseded by v2.
     > This document is frozen for historical reference. Do not edit except to fix factual errors.
     ```
   - Strip "open questions," "deferred," and forward-looking sections from `v1.md` — those belong only in the active version.

3. **Author v2 in `README.md`**:
   - Replace the current `README.md` body with the v2 description.
   - The `Maintenance: Documentation Sync` section must be re-derived for v2 (artifact list may have changed).
   - Add a "Version history" section near the top:
     ```markdown
     ## Version History

     | Version | Status             | Doc              |
     | ------- | ------------------ | ---------------- |
     | v2      | ✅ Current          | this document    |
     | v1      | Retired YYYY-MM-DD | [v1.md](./v1.md) |
     ```

4. **Cross-check related docs and skills**:
   - For every artifact in the v2 sync list, confirm it describes v2 (not a mix of v1/v2 prose).
   - If an artifact must describe both versions during a coexistence period, mark sections explicitly: `### v1 behavior` / `### v2 behavior`.
   - Update related skills to teach v2 patterns; mark v1 patterns as legacy with a retirement date or trigger.

5. **Update ideation status**:
   - The ideation doc that drove the redesign moves status to "Implemented" and gets a link from the v2 doc.
   - Eventually delete the ideation doc once the v2 feature doc fully replaces it.

6. **Run the [knowledge-sync.md](./knowledge-sync.md) completion checklist**.

## Cross-Check List (Both Paths)

For every doc/skill update, verify:

- [ ] All five layers / contract surfaces are described consistently.
- [ ] No reference to the retired shape remains in active docs (or it's explicitly tagged as `### v1 behavior`).
- [ ] Code references (`file.ts:line`) still resolve.
- [ ] Acceptance record reflects what shipped.
- [ ] PR description either commits every artifact update or explicitly states "no change needed: <reason>" per artifact.

## Reviewer Gate

A schema-redesign PR is **not mergeable** until:

1. The cutover decision (in-place vs split) is stated in the PR description.
2. Every artifact in the feature's sync list has either (a) a same-PR update, or (b) an explicit "no change needed" note.
3. If split: the folder promotion, v1 freeze, and v2 authoring are all in the same PR — never spread across PRs.

Treat any missing item as a blocking review finding.
