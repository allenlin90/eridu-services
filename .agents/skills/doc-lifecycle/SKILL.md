---
name: doc-lifecycle
description: Reconcile PRDs, designs, and roadmaps when documentation changes status or location.
---

# Doc Lifecycle

Use this skill when documentation needs lifecycle bookkeeping: promotion, retirement, consolidation, status changes, index updates, or link repair.

## Boundary

This skill manages documentation state. It does not discover product requirements, choose architecture, or produce a design merely because a PRD exists.

- Use [doc-hygiene](../doc-hygiene/SKILL.md) to rewrite a document as current truth.
- Use [monorepo-doc-layering](../monorepo-doc-layering/SKILL.md) to decide where a document belongs.
- Use [ideation-lifecycle](../../workflows/ideation-lifecycle.md) to assess whether an idea is ready for promotion.
- Use [knowledge-sync](../../workflows/knowledge-sync.md) when shipped behavior or engineering conventions changed.
- Use [user-facing-docs](../user-facing-docs/SKILL.md) when a shipped feature needs guides, SOPs, or FAQs.

## Minimum Artifact Model

Keep one canonical document for each durable question. Do not create parallel documents that restate the same scope.

| Question | Canonical home |
| --- | --- |
| Is this idea worth committing to? | `docs/ideation/` |
| What user problem and outcome are we committing to? | `docs/prd/` |
| When will the work happen? | `docs/roadmap/` |
| How will an app implement an unresolved technical shape? | `apps/*/docs/design/` when needed |
| What stable domain contract must implementations follow? | `docs/domain/` |
| What product behavior shipped? | `docs/features/` |
| How does one app's shipped behavior work? | `apps/*/docs/` |
| What accepted implementation gap remains? | `docs/tech-debt/` |

A PRD and a design may coexist only when they answer different questions. Link them and keep requirements in the PRD; do not copy the PRD into the design. A roadmap entry links the canonical document and records status—it does not become another requirements document.

## Workflow

1. **Name the trigger.** Identify the initiative and the lifecycle event: promoted, shipped, deferred, consolidated, moved, or retired.
2. **Inventory the artifact set.** Find its PRD, roadmap entries, ideation docs, designs, plans, feature docs, app docs, and README rows.
3. **Choose the canonical state.** Apply the minimum artifact model and remove duplicate responsibilities.
4. **Apply the transition.** Use [references/bookkeeping.md](references/bookkeeping.md) for the matching procedure.
5. **Update bookkeeping.** Repair the nearest indexes, status labels, roadmap links, and cross-references in the same change.
6. **Retire transient artifacts.** Delete completed PRDs, designs, specs, and plans after preserving any durable decision in its canonical home. Git history is the archive.
7. **Keep the transition with the work.** When one PR completes an artifact, perform its lifecycle transition in that PR. Use a separate bookkeeping PR only for phase-wide reconciliation or cleanup unrelated to one implementation PR.
8. **Verify.** Search for old paths and stale status language, validate relative links, run `pnpm lint:markdown`, and run `pnpm agents:validate` when agent guidance changed.

Do not create a lifecycle report, retirement stub, or changelog entry solely to prove that this skill ran.

## Completion Signal

The lifecycle work is complete when a new reader can identify the current canonical document without reconstructing prior planning history, every index agrees with the filesystem, and no active document claims ownership of work that another document now owns.
