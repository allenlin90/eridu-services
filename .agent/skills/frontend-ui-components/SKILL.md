---
name: frontend-ui-components
description: Provides guidelines for using shared UI components and styling. This skill should be used when implementing UI features using Shadcn/Radix components and the shared @eridu/ui package.
---

# Frontend UI Components

How to build and use UI components using the shared `@eridu/ui` package and Shadcn patterns.

> See [references/ui-component-details.md](references/ui-component-details.md) for detailed code examples.

## `@eridu/ui` Package

All generic UI components live in `packages/ui`. Do NOT create local copies in apps.

```typescript
import { Button } from '@eridu/ui/components/button';
import { Input } from '@eridu/ui/components/input';
import { cn } from '@eridu/ui/lib/utils';
```

## Key Component Rules

| Component | Rule |
|---|---|
| Date/Time Pickers | Use `ResponsiveDateTimePicker` (or `DatePicker`/`DateTimePicker`) from `@eridu/ui`, not native `<input type="date">` |
| Mobile-visible Dialogs | Render as `Drawer` (vaul) below `md`; share body with the desktop `Dialog`. Default to `ResponsiveDateTimePicker` and the responsive dialog pattern for any new dialog reachable on mobile |
| Async Lookup Fields | 2+ `AsyncCombobox` in same form → extract each into `memo()` field component |
| Searchable Inputs | `onSearch` must update query state — never leave as no-op |
| Refresh Buttons | Icon-only (`RotateCw`) + `aria-label` + spinning state while fetching |
| Collapsible Sections | `ChevronUp`/`ChevronDown` toggle, smooth animated transitions |
| Cross-Field Form Invariants | When BE Zod `superRefine` ties one field's value to another's, build the payload through a `buildXxxPayload(form)` helper that **clears irrelevant fields** (don't trust user residue). Disable the irrelevant inputs. Never submit raw state directly. |

## Responsive Dialog → Drawer Pattern

On viewports below the `md` breakpoint (768px), Radix `Popover`/`Dialog` content frequently overflows the viewport or clips inside parent dialogs. House rule:

- **Desktop (≥ md)**: render the desktop primitive (`Dialog`, `Popover`).
- **Mobile (< md)**: render a vaul `Drawer` with the same body, switched via `useIsMobile()` from `@eridu/ui`.
- **One body, two shells**: extract the form/picker body into a shared internal component; never duplicate logic between Dialog and Drawer.
- **Precedent**: `ResponsiveDateTimePicker` in `packages/ui/src/components/date-picker.tsx`.

Applies to: every dialog reachable on a mobile route (actuals editing, shift compensation, task forms, json-form modals, schedule dialogs). Plain confirmations with one button can stay as `Dialog` — escalate when the dialog contains forms, pickers, multi-step content, or anything wider than ~280px.

> Migration guide + code recipe: [references/ui-component-details.md#responsive-dialog-pattern](references/ui-component-details.md#responsive-dialog-pattern).

## Three-Perspective UI Pattern for Entity Features

When designing a feature scoped to an **identity-bearing entity** — `Creator`, studio `Member` (manager / operator / account-manager), or `Show` — consider how it lands across **three perspectives**. The pattern is a design checklist, not a global mandate: each PRD decides which of the three a given sub-PR delivers, defers, or skips.

1. **Studio Overview (Perspective 1)**: Aggregate dashboards, filtered grids, and operations tables (e.g. `/operations-review/submissions`, `/operations-review/show-runs`, `/show-operations`, creator/member roster tables). Manager-facing, studio-wide visibility.
2. **Studio Individual Overview (Perspective 2)**: Manager-facing detail page for a single entity drilled into from a roster. Creator, member, and show variants:
   - `/studios/:studioId/creators/:creatorId` — single creator's attendance, rates, overrides, performance.
   - `/studios/:studioId/members/:memberId` — single member's assignments, audit trail, role context.
   - `/studios/:studioId/shows/:showId` — single show's actuals, platform metrics, violations.
3. **Individual Overview (Perspective 3)**: First-person self-view for the logged-in entity. **The host app differs by entity type:**
   - **Creators**: the entire `erify_creators` app is the creator's self-view. Routes are top-level (`/shows`, `/shows/:showId`) — no `/me/*` prefix, because the JWT scope already identifies the viewer as the creator.
   - **Members**: studio members log into `erify_studios`, which also hosts P1/P2 manager surfaces. A member self-view here needs an explicit `/me/*` prefix to disambiguate from `/studios/:studioId/...` manager routes. Forward-looking — no member `/me/*` ships today.

> **Cross-app widget sharing**: because Perspective 3 for creators lives in a different app (`erify_creators`) from P1/P2 (`erify_studios`), any widget reused across these perspectives MUST live in a shared package (`packages/ui` or a domain-shared package), not in either app's `src/features/`. App-local widgets do not satisfy the reuse rule.
>
> When a PRD does add a feature in more than one perspective, the perspectives must consume the **same shared widgets** with only filter / role-scope variation — no duplicated visualization or query code. Whether all three perspectives are in scope is a PRD decision; widget reuse across whichever perspectives ship is not.

### Reusable Unit Component Standard
To prevent code duplication and logic drift across these three views, **extract and share core unit components**. Component wrappers should simply configure the appropriate API filters and role context before passing them to the shared visual unit:
- `ActualsTimelineViewer`: Shared timeline block visualizing planned vs actual times.
- `ShowRunSummary`: Shared range summary for confirmed show runs, creator attendance, phase checks, and active platform issues.
- `PerformanceMetricsWidget`: Graphical/tabular widget detailing analytical platform statistics (GMV, views) once the analytics infrastructure track lands.
- `CompensationBreakdownCard`: Shared card computing base compensation, commissions, and line items.
- `AttendanceStatusBadge`: Shared visual badge translating `actualStartTime` and `Show.startTime` into colored status highlights.
- `AuditLogTimeline`: Polymorphic audit log history renderer.

Ensure that any new feature touching operational entities adheres to this three-perspective layout from day one.

## Form Contract Coverage

- Compare intended UX against shared API schema before implementation
- Document any omitted contract fields with product rationale
- Date fields: `DatePicker`; datetime: `ResponsiveDateTimePicker` for mobile-reachable surfaces, `DateTimePicker` otherwise
- Native date inputs only with documented exception

## Styling (Tailwind CSS v4)

Use `cn()` from `@eridu/ui/lib/utils` to merge classes safely. Use theme-mapped colors (`bg-primary`, `text-muted-foreground`).

## Component Design Principles

1. **Composition over monolith**: Small, focused components
2. **Children for flexibility**: Use `children` prop for composable layouts
3. **Wrap 3rd party**: Add app-specific behavior, ease future changes
4. **Abstract to `@eridu/ui` when**: Used in multiple apps, generic, stable API, well-tested. Wait for 2-3 use cases.

## Creating New Components

- **App-specific**: Compose from `@eridu/ui` primitives, keep in `src/components/{feature}/`
- **Generic primitives**: Add to `packages/ui/src/components/`, follow Radix+Tailwind pattern

## Checklist

- [ ] Generic components imported from `@eridu/ui`
- [ ] `cn()` for class merging
- [ ] Accessible (Radix primitives, `aria-label` on icon buttons)
- [ ] Theme-mapped Tailwind colors
- [ ] Date fields use `DatePicker` / `DateTimePicker` / `ResponsiveDateTimePicker`
- [ ] Datetime pickers on mobile-reachable forms use `ResponsiveDateTimePicker`
- [ ] Mobile-reachable Dialogs render as `Drawer` below `md` (responsive dialog → drawer pattern) with a shared body
- [ ] 2+ async lookups → isolated `memo()` field components
- [ ] `onSearch` wired to real search state
- [ ] Cross-field invariants enforced via `buildXxxPayload` helper + disabled inputs (not by trusting form state on submit)
- [ ] Entity features designed against the three perspectives (Studio Overview, Studio Individual Overview for creators/members/shows, Individual `/me/*` self-view) — perspectives in scope share one set of widgets; perspectives out of scope are an explicit PRD decision, not an oversight

## Related Skills

- [frontend-code-quality](../frontend-code-quality/SKILL.md) — Quality standards
- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) — Tech stack
