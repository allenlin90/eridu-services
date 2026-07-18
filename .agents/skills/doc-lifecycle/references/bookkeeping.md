# Documentation Lifecycle Bookkeeping

Use only the procedure that matches the current transition. Do not run every section for every documentation change.

## Classify the Current State

Before moving or deleting an artifact, compare its scope with the code and current roadmap:

- **Active** — the committed scope is still in progress.
- **Partial** — a coherent portion shipped while material committed scope remains.
- **Shipped** — the acceptance outcomes are implemented and the completing PR is ready to land.
- **Deferred** — the team is no longer committed to delivering it in the current phase.
- **Operating contract** — the document now defines stable domain semantics rather than future product scope.
- **Obsolete** — another canonical artifact or product decision superseded it.

## PRD Transitions

### Shipped

1. Create or update `docs/features/<feature>.md` with the delivered behavior, users, durable product decisions, acceptance record, and links to app-level canonical docs.
2. Run `user-facing-docs` when users need a guide, SOP, or FAQ.
3. Update `docs/features/README.md`, `docs/prd/README.md`, and the relevant roadmap entry.
4. Delete the PRD. Do not leave a retired stub.

### Partial

- Promote a meaningful shipped outcome to `docs/features/`.
- Rewrite the PRD around only the remaining committed outcome.
- If the remainder no longer warrants a PRD, record it as roadmap scope, ideation, or tech debt according to its nature and delete the PRD.

### Deferred

1. Record the deferral and any sequencing impact in the roadmap.
2. Preserve unresolved discovery in `docs/ideation/` only when the idea remains actionable.
3. Delete the stale PRD. Write a new PRD if the work is recommitted under materially different context.

### Operating Contract

1. Move the stable semantic contract to `docs/domain/<name>.md`.
2. Remove it from the active PRD index.
3. Repoint features, designs, and roadmap entries to the domain contract.

## Design Doc Promotion

When an app design describes shipped behavior:

1. Create or update `apps/<app>/docs/<FEATURE>.md`.
2. Keep purpose, public surface, business rules, design decisions, and known limitations.
3. Remove task lists, file inventories, verification commands, and planning status.
4. Delete the original file under `apps/<app>/docs/design/`.
5. Move its app index entry from Design to Features and repair cross-links.

Leave a design in place while its technical decisions remain active and unshipped. Do not create a design when the PRD plus established implementation patterns are sufficient.

## Planning Artifact Retirement

`docs/superpowers/specs/` and `docs/superpowers/plans/` are transient execution aids.

When the full plan ships:

1. Move any durable decision that is not obvious from code into the appropriate domain, feature, app, rule, or skill document.
2. Delete the completed spec and plan in the completing PR.
3. Remove or repoint references to them.

Keep the artifacts while the plan is active or split across in-flight PRs.

## Tracker Consolidation

Use this when a scope simplification leaves several downstream PRDs restating one established contract.

1. Promote the shared semantic contract to `docs/domain/` when applicable.
2. Represent remaining additive delivery as outcome-sized entries in `docs/roadmap/PHASE_<n>.md`.
3. Delete superseded PRDs, breakdown specs, and implementation plans.
4. Repoint links and shrink indexes that no longer own substantive content.

Do not consolidate a novel feature with unresolved product decisions; keep its PRD active.

## Phase Boundary Reconciliation

At a phase boundary:

1. Classify each active PRD and app design.
2. Apply only the necessary transitions above.
3. Mark the closing and opening phase documents accurately.
4. Reconcile `docs/README.md` and the indexes under `docs/prd/`, `docs/features/`, `docs/roadmap/`, and `docs/ideation/`.
5. Check whether any cross-feature journey now warrants a canonical guide in `docs/workflows/`.
6. Run the ideation lifecycle audit for topics affected by the phase change.

## Link and Index Verification

After a move or deletion:

1. Search the repository for the old filename and path.
2. Confirm all links are relative and target files that exist.
3. Confirm the nearest README matches the files on disk.
4. Confirm roadmap status and links match the canonical artifact.
5. Confirm no document still presents the old artifact as active.
6. Run `pnpm lint:markdown`.
7. Run `pnpm agents:validate` if a skill, rule, workflow, or `AGENTS.md` changed.

## Completion Checklist

- [ ] Each durable question has one canonical owner.
- [ ] Active PRDs describe only committed, unshipped outcomes.
- [ ] Shipped behavior is represented by feature and app canonical docs as needed.
- [ ] Roadmap entries record sequencing and status without duplicating requirements.
- [ ] Completed design and planning artifacts are retired.
- [ ] Deferred ideas and accepted implementation gaps are stored in the correct registers.
- [ ] Indexes, status labels, and cross-references agree with the filesystem.
