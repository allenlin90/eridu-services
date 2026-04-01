---
description: Maintain documentation structure and content at phase boundaries — promote shipped PRDs, clean up stale docs, update indexes and cross-references
---

# Doc Lifecycle Workflow

Run this workflow when closing a phase, after confirming features are deployed to `master`, or when the set of active PRDs changes.

> **Companion**: Run `knowledge-sync.md` when *content* changes (API contracts, behavior, architecture). Run this workflow when *structure* changes (PRDs shipping, phase boundaries, doc reorganization).

## Trigger Conditions

Run when any of these are true:

1. A phase is closing or has just closed.
2. One or more PRDs have been fully implemented and deployed to `master`.
3. A PRD has been officially deferred to a future phase.
4. A cross-feature workstream is complete enough to document as an end-to-end flow.
5. `docs/prd/` contains documents that no longer reflect the current active work.

---

## Steps

### 1. Audit `docs/prd/` against `master`

For each PRD in `docs/prd/` (excluding `README.md`):

- Read the PRD's acceptance criteria.
- Check the codebase on `master` for evidence of implementation:
  - Schema fields exist in `prisma/schema.prisma`
  - API endpoints exist in controllers
  - Frontend pages/components exist
  - Tests cover the behavior
- Classify as one of:
  - **Shipped** — all acceptance criteria met, deployed
  - **Partial** — some criteria met; decide whether to split or defer the remainder
  - **Deferred** — intentionally not built this phase
  - **Active** — still in-progress for the current phase

### 2. Handle each PRD by classification

**Shipped PRDs → promote to `docs/features/`**

1. Create or update `docs/features/<feature-name>.md` with:
   - Status: ✅ Shipped — Phase N
   - Problem statement and users (from PRD)
   - What was delivered (concrete endpoints, fields, behaviors — not implementation detail)
   - Key product decisions (the "why" not captured in code)
   - Links to canonical technical docs (`apps/*/docs/`)
   - Acceptance record with criteria checked off

2. Update `docs/features/README.md` — add a row to the shipped features table.

3. Delete the PRD from `docs/prd/`.

4. **Generate user-facing docs** — run the `user-facing-docs` skill (`.agent/skills/user-facing-docs/SKILL.md`) to produce role-scoped user guides, SOPs, and FAQ entries in `apps/eridu_docs/src/content/docs/`. Cross-link the feature doc to the generated user guides and vice versa.

**Deferred PRDs → clean up, record deferral**

1. Note the deferral in the relevant `docs/roadmap/PHASE_N.md` under "Out of Scope" or "Deferred".
2. If the work carries to the next phase: delete the old PRD and rewrite it fresh for the new phase context. Never carry a stale PRD forward unchanged.
3. If permanently deprioritized: delete the PRD; add a parking lot entry in the next phase doc.

**Partial PRDs → split or defer**

- If the shipped portion is meaningful on its own: promote the shipped part to `docs/features/`, rewrite the PRD to cover only the remaining work.
- If the remainder is too small to stand alone: add it to the phase doc's parking lot and delete the PRD.

**Active PRDs → leave in place, verify accuracy**

- Ensure the acceptance criteria still reflect what's actually in scope.
- Update if the scope changed during implementation.

### 3. Evaluate whether a workflow doc is needed

A `docs/workflows/<name>.md` document is warranted when:

- A user journey meaningfully spans two or more shipped features, AND
- The end-to-end flow would be confusing to reconstruct from individual feature docs alone

If warranted:
1. Create `docs/workflows/<name>.md` with:
   - Actors and their roles
   - Flow overview (numbered steps, simple diagram)
   - Step-by-step narrative with cross-links to feature docs and technical docs
   - Data flow between steps
   - Key business rules that span the whole flow
2. Update `docs/workflows/README.md` — add a row to the workflows table.

### 4. Update roadmap phase docs

For the **closing phase** (`docs/roadmap/PHASE_N.md`):

- Mark status as ✅ Closed (or Completed).
- In the canonical specs table: remove links to deleted PRDs; link directly to `docs/features/<feature>.md` and `apps/*/docs/` instead.
- Add a delivery summary if one doesn't exist.
- Record any items explicitly deferred to the next phase.

For the **opening phase** (`docs/roadmap/PHASE_N+1.md`):

- Update status from "Deferred / parking lot" to "Active" once the phase starts.
- List the promoted workstreams at the top of the document.
- Move parking lot items to an active section only when they have clear owners and exit criteria.

### 5. Update index files

Update all of the following to reflect the new state:

- **`docs/README.md`** — current phase state block (which phase is closed, which is active, which workstreams are promoted)
- **`docs/prd/README.md`** — Phase N PRDs table (remove shipped/deleted rows, move to Shipped reference section; update Phase N+1 table)
- **`docs/roadmap/README.md`** — phase list entries (✅ closed / 🚧 active labels)

### 6. Cross-check ideation docs

After handling PRDs, check `docs/ideation/` for related topics:

1. **Deferred PRDs → check for ideation capture**: If a PRD is being deferred, ensure the reasoning and context are preserved in an ideation doc (create one if it doesn't exist).
2. **Shipped features → check for ideation promotion**: If a shipped feature satisfies decision gates in an ideation doc, flag that topic for promotion or update.
3. **Phase close → audit ideation staleness**: Review active ideation docs. Any topic sitting for 2+ phases without promotion should be refreshed or dropped.
4. Update `docs/ideation/README.md` tables to reflect any changes.

See `.agent/workflows/ideation-lifecycle.md` for the full cross-check workflow.

### 7. Verify cross-references

After any file moves or deletions:

```bash
# Check for broken links to deleted/moved files
grep -r "docs/prd/<deleted-name>" . --include="*.md" --exclude-dir=node_modules --exclude-dir=.git
grep -r "docs/product/" . --include="*.md" --exclude-dir=node_modules --exclude-dir=.git
```

- Fix any stale path references in skills, rules, app READMEs, and design docs.
- Check that `docs/features/README.md` and `docs/workflows/README.md` index entries are accurate.
- Check that PHASE_N.md canonical specs table points to files that actually exist.

---

## Completion Checklist

- [ ] Every shipped PRD is promoted to `docs/features/` with acceptance criteria checked off.
- [ ] Every shipped PRD has corresponding user-facing docs in `eridu_docs` (user guides, SOPs, and/or FAQ entries) per `user-facing-docs` skill.
- [ ] Every deferred PRD is deleted; deferral is recorded in the phase doc.
- [ ] No PRD in `docs/prd/` describes already-shipped work.
- [ ] New cross-feature flows have a `docs/workflows/` entry if warranted.
- [ ] Closing phase doc is marked closed with updated canonical specs.
- [ ] Opening phase doc is marked active with promoted workstreams listed.
- [ ] `docs/README.md` phase state is accurate.
- [ ] `docs/prd/README.md` tables match the actual files on disk.
- [ ] No stale `docs/product/` or other broken path references remain.
- [ ] `docs/features/README.md` and `docs/workflows/README.md` indexes are up to date.
- [ ] `docs/ideation/README.md` active topics table is accurate (no stale entries, no missing deferrals).

---

## Feature Doc Template

```markdown
# Feature: <Feature Name>

> **Status**: ✅ Shipped — Phase N
> **Workstream**: N
> **Canonical docs**: [<backend doc>](...), [<frontend doc>](...)

## Problem

<Why this feature was built. Who was blocked and how.>

## Users

| Role | Need |
| --- | --- |
| ... | ... |

## What Was Delivered

<Concrete list: endpoints, fields, behaviors. Not implementation detail — link to canonical docs for that.>

## Key Product Decisions

<The "why" that isn't in code: tradeoffs made, options rejected, scope boundaries.>

## Acceptance Record

- [x] ...
- [x] ...
```

## Workflow Doc Template

```markdown
# Workflow: <Workflow Name>

<One paragraph: what user journey this covers and why it spans multiple features.>

## Actors

| Actor | Role | Key Capability |
| --- | --- | --- |

## Flow Overview

\`\`\`
1. Step one
   ↓
2. Step two
   ↓
3. Step three
\`\`\`

## Step-by-Step

### 1. <Step name>
<Narrative + links to feature docs and technical docs.>

## Data Flow

\`\`\`
<simple ASCII data flow>
\`\`\`

## Key Business Rules

<Rules that span the whole flow and aren't obvious from individual feature docs.>

## Related Docs

| Layer | Document |
| --- | --- |
| Feature | [docs/features/...](../features/...) |
| PRD | [docs/prd/...](../prd/...) |
| Backend | [apps/erify_api/docs/...](../../apps/erify_api/docs/...) |
| Frontend | [apps/erify_studios/docs/...](../../apps/erify_studios/docs/...) |
```
