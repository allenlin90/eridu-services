# Frontend Design and Implementation Plan: Show Readiness Triage Panel

> **TLDR**: Redesign the studio shows readiness section from a flat metric strip into an admin triage surface. The goal is to help studio admins decide what to do next, not just inspect numbers. The new UX keeps the current API and scope behavior, but restructures the UI into a summary header, prioritized action buckets, and lightweight drill-down details.

> [!NOTE]
> **Status: Implemented** — The FE redesign is now shipped. This document remains as design reference + implementation boundaries.

## 0. Implementation Notes (Shipped)

Implemented on:

1. `apps/erify_studios/src/routes/studios/$studioId/shows/index.tsx`
2. `apps/erify_studios/src/features/studio-shows/components/show-readiness/show-readiness-triage-panel.tsx`
3. `apps/erify_studios/src/features/studio-shows/utils/show-readiness.utils.ts`

Shipped behavior differences/clarifications:

1. Scope label copy is simplified to `Readiness for selected scope (...)`.
2. Date label formatting shows a single date when `date_from === date_to`; otherwise `start to end`.
3. Mobile and desktop bucket UIs intentionally differ:
   - mobile: compact stacked bucket rows
   - desktop: richer 3-column action cards
4. Bucket actions are intentionally `Inspect` only; the single issues CTA remains in summary.

## 1. Purpose

Define a safer frontend redesign plan for the readiness section on:

- `apps/erify_studios/src/routes/studios/$studioId/shows/index.tsx`

Primary FE objective:

- Help a studio admin move from scope awareness to concrete action with minimal cognitive load.

---

## 2. Scope

In scope:

1. Redesign the existing readiness summary UI in `/studios/:studioId/shows`.
2. Reframe the section around admin decision-making and next actions.
3. Preserve current backend data contracts and readiness semantics.
4. Preserve current date scope, refresh behavior, and collapse behavior.
5. Define safer FE implementation boundaries so the route does not become a monolithic rewrite.

Out of scope:

1. Backend/API contract changes.
2. New readiness business logic.
3. Replacing the existing `Issues` table filter.
4. Building a dedicated analytics/report page.
5. Large unrelated refactors in the shows route.

---

## 3. Current State

1. The current readiness section behaves like a compact dashboard strip.
2. It exposes multiple counts with near-equal visual weight.
3. The section does not clearly communicate which issue category should be handled first.
4. The section does not provide an intentional workflow bridge into the show list beyond the existing table filter pattern.

## 3.1 Confirmed UX Gaps

1. Metrics are visually flat, so important numbers and secondary numbers compete for attention.
2. Some counts lack managerial context unless the admin manually interprets the denominator.
3. The section emphasizes inspection over action.
4. Adding too much logic directly into the route file creates regression risk and weakens maintainability.

---

## 4. Users and Workflow

Primary user:

1. Studio admin managing readiness before upcoming shows.

Primary workflow:

1. Set the scope date range.
2. Check overall readiness quickly.
3. Understand the dominant blocker category.
4. Inspect the affected shows for that category.
5. Move into the filtered show list and take action.

The redesign should optimize for this workflow order rather than for KPI completeness.

---

## 5. Target UX Behavior

## 5.1 Summary First

The top of the section should answer:

1. How many shows need attention?
2. How healthy is this scope overall?
3. What should I work on first?

Required content:

1. Headline:
   - `X of Y shows need attention`
2. Support text:
   - plain-language interpretation of the dominant issue
3. One progress indicator:
   - `% ready` or equivalent ready/in-scope framing
4. One action bridge:
   - CTA that activates the existing `Issues` list filter

## 5.2 Action Buckets

Below the summary, group readiness work into three buckets:

1. `No task plan`
2. `Unassigned workload`
3. `Missing required coverage`

Each bucket should show:

1. Primary count
2. One or two supporting contextual numbers
3. Severity styling
4. An `Inspect` interaction for details

## 5.3 Lightweight Drill-Down

The default state should stay compact. Detailed show-level data should be hidden until requested.

Allowed interaction patterns:

1. Popover
2. Inline expandable panel
3. Sheet/drawer if density requires more space

Drill-down item fields:

1. Show name
2. Show time/date
3. Readiness issue tags
4. Optional severity cue for multi-issue shows

---

## 6. Product Logic and Prioritization

The FE should infer the primary admin action using existing readiness warnings in this order:

1. `No tasks`
2. `Unassigned tasks`
3. `Missing required task types / missing moderation`

Reasoning:

1. `No tasks` means the show lacks execution structure entirely.
2. `Unassigned tasks` means planning exists, but staffing is incomplete.
3. Missing required coverage is usually a structural completeness gap after a plan already exists.

This prioritization is a presentation rule only. It must not change readiness semantics or API filters.

---

## 7. Numbers That Matter

Primary numbers:

1. `Shows needing attention / shows in scope`
2. `% ready`

Secondary numbers:

1. `Shows with no tasks`
2. `Unassigned tasks`
3. `Shows missing required coverage`

Contextual/supporting numbers:

1. `Affected shows`
2. `Average unassigned tasks per affected show`
3. Coverage subtype counts, for example:
   - missing `SETUP`
   - missing `CLOSURE`
   - missing moderation on premium shows

Numbers to avoid in the default view:

1. Large KPI walls where six metrics share identical visual weight
2. Low-signal counters without denominator or action meaning

---

## 8. UX Requirements

1. The section must remain compact in its default state.
2. The first visible content must explain action priority, not just report counts.
3. The admin must be able to move directly from summary to issue-focused list workflow.
4. Desktop and mobile layouts must remain readable.
5. The section must tolerate zero-show and zero-issue states gracefully.
6. The section must not introduce visual noise that competes with the main shows table.

---

## 9. Data Contract Dependencies

This redesign should use only existing frontend-accessible data:

1. `showsScopeResponse.meta.total`
2. `shiftAlignmentResponse.task_readiness_warnings`
3. Existing warning fields:
   - `has_no_tasks`
   - `unassigned_task_count`
   - `missing_required_task_types`
   - `missing_moderation_task`
   - `show_name`
   - `show_start`
   - `show_end`
   - `show_standard`

No new backend dependency is required for the first implementation.

---

## 10. FE Architecture and File Boundaries

The previous failed attempt showed that this should not be implemented as another large route-level rewrite.

Recommended boundary split:

1. Route container:
   - `apps/erify_studios/src/routes/studios/$studioId/shows/index.tsx`
   - owns scope wiring, route search interaction, and section composition
2. Readiness view-model hook or derived helpers:
   - colocated under a relevant feature folder if logic becomes non-trivial
   - owns readiness grouping, prioritization, and display-ready derived values
3. Presentation components:
   - summary header card
   - action bucket card/list item
   - drill-down interaction content

Preferred extraction direction:

1. `apps/erify_studios/src/features/studio-shows/components/show-readiness/*`

This keeps the route focused on composition and avoids another unstable 500+ line route diff.

---

## 11. File-Level Implementation Plan

Potential targets:

1. `apps/erify_studios/src/routes/studios/$studioId/shows/index.tsx`
2. `apps/erify_studios/src/features/studio-shows/components/show-readiness/*`
3. `apps/erify_studios/src/features/studio-shows/utils/*` if derived grouping logic needs a reusable home

Suggested component split:

1. `show-readiness-section.tsx`
2. `show-readiness-summary-card.tsx`
3. `show-readiness-action-card.tsx`
4. `show-readiness-issue-list.tsx`
5. Optional helper:
   - `show-readiness.utils.ts`

---

## 12. Interaction Requirements

1. Keep the current refresh button pattern:
   - icon-only
   - explicit `aria-label`
   - spinner while fetching
2. Keep the current collapse/expand pattern:
   - chevron icon button
   - smooth collapse animation
3. Keep the current date scope behavior unchanged.
4. Keep the existing `Issues` filter as the action bridge into the table.

---

## 13. Visual Direction

Visual goals:

1. Strong hierarchy between headline and supporting metrics
2. Clear severity grouping
3. Reduced density compared with the current flat metric row
4. Calm, operational styling rather than decorative dashboard styling

Styling guidance:

1. One dominant summary block
2. Three clearly separated action buckets
3. Use color sparingly for severity and state, not for every metric
4. Use badges only where they add classification value

---

## 14. States and Edge Cases

Required states:

1. Loading
2. Collapsed
3. No scope selected
4. Invalid scope
5. No shows in scope
6. All clear / zero issues
7. Mixed issue states

Edge cases:

1. A show can appear in more than one bucket.
2. Premium moderation gaps should only display where relevant.
3. Drill-down UI should not overflow badly on mobile.
4. Zero values should not create misleading “healthy” language when there are no shows in scope.

---

## 15. Testing Plan

## 15.1 Unit/component tests

1. Summary headline for:
   - no shows
   - all clear
   - issue-present states
2. Primary-action prioritization logic
3. Bucket grouping logic
4. Drill-down issue tag rendering

## 15.2 Integration tests

1. Existing shows route still loads and renders under normal scope
2. `Issues` filter CTA still narrows the list correctly
3. Collapse and refresh controls still behave as before

---

## 16. Risks

Risks:

1. Repeating a route-local monolithic rewrite can break the page while still passing static checks.
2. Over-designing the section can create more noise than the current version.
3. Too many derived display rules can drift from the actual readiness semantics.

Mitigations:

1. Extract presentation components and keep the route as composition only.
2. Preserve the current API contract and readiness definitions.
3. Keep the first implementation intentionally small and test the grouping logic.

---

## 17. Acceptance Criteria

1. A studio admin can understand overall scope readiness in one glance.
2. The section clearly indicates the next action category.
3. The section supports lightweight inspection of affected shows without forcing a page transition.
4. The existing `Issues` table flow remains the main follow-up path.
5. The implementation does not significantly increase route-file complexity.
6. The page remains stable under loading, empty, and mixed-warning states.

---

## 18. Recommended Delivery Sequence

1. Extract small readiness presentation components first.
2. Implement derived grouping and priority helpers second.
3. Replace the current readiness metric strip with the new layout third.
4. Add focused tests for prioritization and grouped rendering.
5. Validate on desktop and mobile before merging.
