---
name: ui-ux-pro-max
description: Layout consistency and UX quality guardrails for frontend routes. Use when a page looks strange, navigation feels inconsistent, action hierarchy is unclear, or responsive behavior regresses.
---

# UI UX Pro Max

Use this skill when refining route/page layout quality in `erify_studios` or `erify_creators`, especially when users report "looks strange" or "flow is confusing."

This skill focuses on practical UX consistency within the existing design system (`@eridu/ui`). It does not replace product requirements or feature-specific skills.

## Use This Skill When

- Navigation pattern differs across similar pages/routes
- Action area is cluttered or primary action is unclear
- Header/cards/padding feel oversized or visually noisy
- Mobile/tablet behavior causes overlap, clipping, or awkward scrolling
- Filters/controls are shown even when not relevant to selected data

## Do Not Use This Skill When

- Task is purely backend/API with no UI surface
- Requested change is intentionally experimental and overrides consistency
- Existing feature-specific skill has stricter visual rules (follow that first)

## UI UX Pro Max Pass (Required Audit)

Before editing, run this 6-point audit:

1. Purpose clarity
   - Can a user identify page purpose in 3 seconds?
2. Navigation consistency
   - Is "where I am" + "how to go back" obvious and consistent with sibling routes?
3. Action hierarchy
   - Is there exactly one clear primary action per section?
4. Information density
   - Is spacing proportional to value, or is whitespace/padding wasting vertical space?
5. Contextual controls
   - Are filters/controls only shown when data/columns support them?
6. Responsive integrity
   - Do desktop/tablet/mobile all avoid overlap and preserve core tasks?

If any answer is "no", fix that before adding visual polish.

## Route Layout Guardrails

### 1. Single-purpose route composition

- Keep each route focused:
  - viewer route: browse/open
  - builder route: configure/save/preflight
  - result route/view: inspect/export
- Avoid mixing multiple workflows in one crowded region.

### 2. Navigation pattern consistency

- Desktop:
  - breadcrumb in header
- Mobile:
  - one explicit back action at the top
- Do not duplicate conflicting nav controls in the same viewport.

### 3. Action grouping

- Group by intent:
  - definition management (save/cancel)
  - execution (preflight/run)
  - export/share
- Primary action must be visually dominant and singular inside each group.
- Secondary actions should not compete with the primary CTA.

### 4. Density and spacing

- Large headers/padding must justify themselves.
- For dense data pages:
  - compact card headers (`text-sm`, tighter `py`)
  - keep metadata concise and inline
  - avoid stacked wrappers that create redundant borders/padding

### 5. Contextual filters only

- Show a filter only when:
  - corresponding data exists, and
  - selected columns/surface context supports it.
- If a filter becomes unavailable after context changes:
  - clear stale filter value automatically.

### 6. Responsive table behavior

- Sticky/frozen columns are desktop-first.
- On mobile, disable frozen columns if they cause overlap while horizontal scrolling.
- Keep horizontal scroll behavior predictable and unobstructed.

## Accessibility Baseline

- All icon-only controls need explicit `aria-label`.
- Preserve tab order and visible focus.
- Do not hide critical actions behind hover-only interaction.
- Ensure color/contrast remains readable in muted/secondary text regions.

## Implementation Workflow

1. Identify inconsistency with the 6-point audit.
2. Apply the smallest layout refactor that restores consistency.
3. Keep to existing `@eridu/ui` primitives and token patterns.
4. Add/adjust component tests for:
   - action enable/disable behavior
   - contextual filter visibility
   - responsive class/behavior regressions when feasible
5. Run workspace verification:
   - `pnpm --filter <workspace> lint`
   - `pnpm --filter <workspace> typecheck`
   - `pnpm --filter <workspace> test`

## Definition of Done

- Route purpose is unambiguous
- Navigation pattern matches sibling surfaces
- Primary CTA is clear and not competing
- No oversized/padded blocks without value
- Only relevant filters are visible
- Mobile view has no overlap/clipping for core interactions
