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

## Simple Artifact Model

Most initiatives need one active canonical document, not one document in every folder. Use three lifecycle roles:

| Role                   | Question                                                | Canonical home                                                        |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Committed requirements | What are we ready and intending to build?               | `docs/prd/`                                                           |
| Optional design        | Which unresolved implementation decisions must be made? | `apps/*/docs/design/`, only when needed                               |
| Current truth          | What behavior or contract exists now?                   | Choose `docs/features/`, `apps/*/docs/`, or `docs/domain/` by scope   |

A PRD exists only for work the team is ready and intends to deliver. If the scope is not committed, is waiting on a trigger, or is only a future possibility, keep it in `docs/ideation/`. Do not create `current`, `next`, or `future` PRD buckets.

The default path is **ideation (optional) → PRD → current truth → retire the PRD**. Add a design only when established implementation patterns do not answer a material technical question. A PRD and design may coexist only when they answer different questions; link them instead of copying requirements.

One PRD may contain phased capabilities only when every included capability is committed and they share one product outcome. Put uncommitted later capabilities in ideation. Split a PRD when capabilities have independent commitments or owners and the combined acceptance boundary is unclear; do not split documents merely because the implementation has separate technical layers.

The other locations are registers, not parallel specifications:

| Register          | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `docs/ideation/`  | Anything not yet ready or committed, including future possibilities       |
| `docs/roadmap/`   | Sequence and status, linked to the canonical document                     |
| `docs/tech-debt/` | Accepted implementation gaps that remain after delivery                   |

For current truth, choose the narrowest sufficient owner: `docs/features/` for cross-app product behavior, `apps/*/docs/` for one app's behavior, or `docs/domain/` for a stable semantic contract. Create more than one only when they serve genuinely different scopes or audiences.

## Workflow

1. **Name the trigger.** Identify the initiative and the lifecycle event: promoted, shipped, decommitted, consolidated, moved, or retired.
2. **Inventory the artifact set.** Find its PRD, roadmap entries, ideation docs, designs, plans, feature docs, app docs, and README rows.
3. **Choose the canonical state.** Apply the simple artifact model and remove duplicate responsibilities.
4. **Apply the transition.** Use [references/bookkeeping.md](references/bookkeeping.md) for the matching procedure.
5. **Update bookkeeping.** Repair the nearest indexes, status labels, roadmap links, and cross-references in the same change.
6. **Retire transient artifacts.** Delete completed PRDs, designs, specs, and plans after preserving any durable decision in its canonical home. Git history is the archive.
7. **Keep the transition with the work.** When one PR completes an artifact, perform its lifecycle transition in that PR. Use a separate bookkeeping PR only for phase-wide reconciliation or cleanup unrelated to one implementation PR.
8. **Verify.** Search for old paths and stale status language, validate relative links, run `pnpm lint:markdown`, and run `pnpm agents:validate` when agent guidance changed.

Do not create a lifecycle report, retirement stub, or changelog entry solely to prove that this skill ran.

## Completion Signal

The lifecycle work is complete when a new reader can identify the current canonical document without reconstructing prior planning history, every index agrees with the filesystem, and no active document claims ownership of work that another document now owns.
