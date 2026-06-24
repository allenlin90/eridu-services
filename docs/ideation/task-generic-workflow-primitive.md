# Ideation: Task as a Generic Workflow Primitive

> **Status**: Active — first instance shipped in PR #230; further generalization deferred
> **Origin**: Show State Gate design review, June 2026
> **Related**: [Show State Gate design](../superpowers/specs/2026-06-23-show-state-gate-design.md), [Task Template Purpose Separation](./task-template-purpose-separation.md)

## What

`Task` was designed around manager-authored, template-driven operational/moderation work (a human picks a template, fills a form, an assignee executes it). The Show State Gate design reuses `Task` for a different purpose: a system-generated, code-defined workflow control point (`TaskType.STATE_GATE`) with no template/snapshot, created by backend logic rather than a manager filling a form. The first instance (show cancellation → pending resolution → resolved) is being implemented now. This doc tracks the broader question the first instance raises but does not answer: should `Task` formally become a general-purpose execution/workflow primitive for *any* "needs an owner, a deadline, and a chosen outcome" requirement across the platform, beyond Show — and if so, what needs to generalize to support that safely.

## Why It Was Considered

- `Task` already has every structural piece this kind of work needs: assignee, due date, free-text content/metadata, status lifecycle, polymorphic `TaskTarget` linking. Building a new table per workflow (as PR #229 originally did for cancellation) duplicates this every time.
- The existing task surfaces (`my-tasks`, `task-review`, `/system/tasks/`) give any reuse of `Task` free manager-facing discovery, filtering, and an ops-level cross-studio view — a real adoption incentive for routing future "gate" requirements through `Task` instead of bespoke tables.
- Show-production-lifecycle's `state-gates.md` already names "no task/issue linkage yet" as an explicit gap for more than just cancellation — other transitions in the same state machine (e.g. `live → completed` readiness checks) could plausibly want the same shape later.

## Why It Was Deferred (scope held back from this iteration)

1. **Entity scope.** `openGate`/`resolveGate` in the State Gate design are Show-specific (they call `ShowRepository`/`ShowStatusService` directly) — they are not yet an entity-agnostic interface. Generalizing to "any entity with a status field" is deferred until a second entity (not Show) actually needs this shape; building that abstraction speculatively now would be guessing at a shape with only one data point.
2. **System-generated vs human-authored taxonomy.** `STATE_GATE` is the first `Task.type` value with no template/snapshot and content fully defined by code (`GATE_CONFIG`). There is no documented convention yet for "this is a system-generated task kind" as a category distinct from manager-authored kinds (`SETUP`/`ACTIVE`/`CLOSURE`/`ADMIN`/`ROUTINE`/`OTHER`). Formalizing that convention (naming, where config lives, content/metadata envelope shape) is deferred until a second system-generated kind appears — one data point isn't enough to generalize a convention from.
3. **UI treatment.** Today's task surfaces don't visually distinguish system-generated tasks from human-authored ones (same card style, same generic "complete" action pattern that the State Gate design has to specifically disable). Whether that distinction needs dedicated UI treatment is deferred until system-generated kinds are common enough that the lack of distinction confuses managers in practice.
4. **Relationship to Task Template Purpose Separation.** That ideation topic is about a different axis — visibility of *human-authored* templates by studio role (regular vs. moderation). This topic is about *system- vs human-generated* task content. They may eventually intersect (e.g. a "system" purpose category) but should not be conflated; keep them as separate ideation entries until one's resolution clarifies the other.

## Decision Gates for Promotion

Promote to a PRD (formalizing `Task` as a general workflow primitive) when **any** of these are true:

1. A second entity (not `Show`) needs the same "owner + due date + chosen outcome before continuing" shape — generalize `openGate`/`resolveGate` to an entity-agnostic interface at that point, informed by two real use cases instead of one guessed-at abstraction.
2. A second system-generated (template-less) `Task.type` appears beyond `STATE_GATE` — formalize the system-generated task kind convention instead of letting each one invent its own metadata shape.
3. Managers report confusion distinguishing system-generated tasks from their own authored work in `my-tasks`/`task-review` — add dedicated UI treatment (badge, icon, or filter) at that point.

## Implementation Notes (Preserved Context)

- First concrete instance: `docs/superpowers/specs/2026-06-23-show-state-gate-design.md` — `TaskType.STATE_GATE`, `GATE_CONFIG` lookup keyed by `gate_kind`, `openGate`/`resolveGate` primitives, Show-scoped only.
- If/when entity-agnostic generalization happens, the natural seam is wherever `openGate`/`resolveGate` currently reach into `ShowRepository`/`ShowStatusService` directly — that's the Show-specific coupling that would need to become a passed-in strategy/adapter per target entity type.
- Cross-check this doc per `.agent/workflows/ideation-lifecycle.md` whenever a future design proposes a second "owner + due date + outcome" workflow for any entity, or a second template-less `Task.type` — don't let a second instance get built ad hoc without revisiting gate 1/2 above.
