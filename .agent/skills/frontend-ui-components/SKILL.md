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

When developing or updating any feature scoped to an **identity-bearing entity** — `Creator`, studio `Member` (manager / operator / account-manager), or `Show` — that surface MUST be designed and shipped across **three distinct perspectives**, all consuming the same shared unit components. Applies to actuals, attendance, compensation, performance metrics, audits, line items, and violations.

1. **Studio Overview (Perspective 1)**: Aggregate dashboards, filtered grids, and operations tables (e.g. `/finance/actuals` review panel, `/show-operations`, creator/member roster tables). Used by managers for studio-wide visibility.
2. **Studio Individual Overview (Perspective 2)**: Manager-facing detail page for a single entity drilled into from a roster. Both creator and member surfaces qualify:
   - `/studios/:studioId/creators/:creatorId` — single creator's attendance, rates, overrides, performance.
   - `/studios/:studioId/members/:memberId` — single studio member's assignments, audit trail, role context.
   - `/studios/:studioId/shows/:showId` — single show's actuals, platform metrics, violations.
3. **Individual Overview (Perspective 3)**: First-person `/me/*` self-view for the logged-in entity. The current creator app (`erify_creators`) ships the creator's self-view; a parallel `/me/*` member self-view will land alongside future member-facing features. A feature is not "done" until the self-view surface is at least scoped (delivered now or queued in roadmap).

> **Symmetry rule**: if a feature shows a creator their own X via `/me/*`, a manager must be able to see the same X for any creator via Perspective 2 and rolled-up across creators via Perspective 1 — and vice versa. The same rule applies to member-scoped features. Missing any one perspective is a design gap, not a phasing decision, unless explicitly justified in the PRD.

### Reusable Unit Component Standard
To prevent code duplication and logic drift across these three views, **extract and share core unit components**. Component wrappers should simply configure the appropriate API filters and role context before passing them to the shared visual unit:
- `ActualsTimelineViewer`: Shared timeline block visualizing planned vs actual times.
- `PerformanceMetricsWidget`: Graphical/tabular widget detailing platform statistics (GMV, views).
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
- [ ] Entity features structured in three perspectives (Studio Overview, Studio Individual Overview for creators/members/shows, and Individual `/me/*` self-view) with shared unit components — symmetry across all three confirmed or gap explicitly justified

## Related Skills

- [frontend-code-quality](../frontend-code-quality/SKILL.md) — Quality standards
- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) — Tech stack
