---
description: Cross-check ideation topics during design, investigation, and review phases to prevent stale accumulation and surface promotable ideas
---

# Ideation Lifecycle Workflow

Run this workflow during design reviews, optimization investigations, and code reviews to keep `docs/ideation/` current and actionable.

> **Companion**: Run `doc-lifecycle.md` for phase boundary cleanups (PRD promotion, index updates). Run this workflow for ideation-specific cross-checks during active development.

## Trigger Conditions

Run when any of these are true:

1. **Design phase**: Writing or reviewing a technical design doc (`apps/*/docs/design/`).
2. **Investigation phase**: Evaluating an optimization, performance improvement, or architectural change.
3. **Review phase**: Reviewing a PR that touches a feature area with related ideation topics.
4. **Phase planning**: Selecting workstreams for a new phase.
5. **Periodic audit**: Every 2 phases (or ~3 months), audit all ideation docs for staleness.

---

## Steps

### 1. Identify related ideation topics

Before starting design, investigation, or review work:

1. Read `docs/ideation/README.md` to see the active topics index.
2. For each active topic, check if it is related to the current work area:
   - Does the design doc reference the same domain or feature?
   - Does the investigation touch the same performance/architecture concern?
   - Does the PR modify code in the same module?
3. If related topics exist, read them before proceeding with the design/review.

### 2. Cross-check during design

When writing or reviewing a design doc:

1. **Check for promotion triggers**: Does the current design work satisfy any decision gates listed in related ideation docs?
   - If yes → flag for promotion. Note which gates are met and recommend creating a PRD.
   - If partially → update the ideation doc with new context (e.g. "Gate 2 is closer now because X was implemented").
2. **Check for invalidation**: Does the current design make any ideation topic obsolete or invalid?
   - If the approach changed fundamentally → update or drop the ideation doc.
   - If a prerequisite was removed → update the decision gates.
3. **Check for new deferrals**: Does the current design identify new topics that should be deferred?
   - If yes → create a new ideation doc following the template below.

### 3. Cross-check during investigation

When evaluating optimizations or architectural changes:

1. **Check if an ideation doc already covers this topic**: Avoid duplicating investigation effort.
   - If the ideation doc has good context → build on it rather than starting fresh.
   - If the ideation doc is outdated → update it with new findings.
2. **Check decision gates against production data**: If the investigation produces metrics (e.g. P95 latency, result sizes), compare against the ideation doc's decision gates.
   - If gates are met → recommend promotion to PRD.
   - If gates are not met → record the current metrics in the ideation doc for future comparison.

### 4. Cross-check during review

When reviewing a PR:

1. **Check if the PR's changes affect ideation assumptions**: Does the PR introduce something that changes the reasoning in an ideation doc?
   - New infrastructure (e.g. Redis added for caching) → check if this unblocks a deferred topic.
   - Schema changes → check if any ideation doc assumed the old schema.
   - Performance changes → check if any decision gate metrics are affected.
2. **Flag stale ideation docs in review comments**: If a reviewer notices that an ideation doc's context is outdated, flag it for update.

### 5. Audit for staleness

During phase planning or periodic audits:

1. For each active ideation doc:
   - Has it been sitting for 2+ phases without promotion? → Review and decide: refresh, promote, or drop.
   - Are its decision gates still relevant? → Update if the product direction has shifted.
   - Are its implementation notes still accurate? → Update if the codebase has changed.
2. Update `docs/ideation/README.md`:
   - Move dropped topics to the "Dropped / Promoted" table with date and reason.
   - Update the "Active Topics" table to reflect current state.

---

## Ideation Doc Template

When creating a new ideation doc:

```markdown
# Ideation: <Topic Name>

> **Status**: Deferred from <phase/feature>
> **Origin**: <where this was identified> (<date>)
> **Related**: <links to design docs, PRDs, or features>

## What

<What would be built. 2-3 sentences.>

## Why It Was Considered

<Why this seemed worth doing. Bullet points.>

## Why It Was Deferred

<Why it's not being built now. Numbered list with concrete reasons.>

## Decision Gates for Promotion

Promote to a PRD when **any** of these are true:

1. <Concrete, measurable condition>
2. <Concrete, measurable condition>

## Implementation Notes (Preserved Context)

<Technical details that would be expensive to re-derive. Include schema shapes, algorithm sketches, integration points, and verification items.>
```

---

## Completion Checklist

- [ ] All active ideation topics related to the current work area have been cross-checked.
- [ ] Decision gates have been evaluated against current state (code, metrics, product direction).
- [ ] Outdated ideation docs have been updated or flagged for update.
- [ ] New deferrals from the current design/investigation have been captured as ideation docs.
- [ ] `docs/ideation/README.md` active topics table is accurate.
- [ ] No ideation doc has been sitting for 2+ phases without review.
