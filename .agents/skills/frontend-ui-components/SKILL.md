---
name: frontend-ui-components
description: Build UI with Shadcn, Radix, and @eridu/ui while matching shipped component, form, and styling patterns.
---

# Frontend UI Components

How to build and use UI components using the shared `@eridu/ui` package and Shadcn patterns.

> See [references/ui-component-details.md](references/ui-component-details.md) for detailed code examples.

## `@eridu/ui` Package

All generic UI components live in `packages/ui`. Do NOT create local copies in apps.

```typescript
import { Button } from '@eridu/ui/components/ui/button';
import { Input } from '@eridu/ui/components/ui/input';
import { cn } from '@eridu/ui/lib/utils';
```

The root `@eridu/ui` barrel remains supported for ordinary named imports. Prefer a stable component subpath for heavy optional surfaces or lazy consumer imports so the intended bundle boundary is explicit. Keep `packages/ui/package.json#sideEffects` limited to real side-effect assets such as the exported global stylesheet; JavaScript component modules must remain tree-shakeable.

## Decision Priority

When a UI/UX implementation choice isn't dictated by an explicit instruction, resolve it in this order — each tier only breaks ties the tier above it left open:

1. **Fulfill the requirement and feature** — the user-facing behavior actually requested must work. Don't let pattern-matching produce a component that looks right but doesn't do the job (e.g. a disabled-looking button that's actually wired to the wrong field).
2. **Project conventions and already-implemented patterns** — match the nearest existing equivalent in this codebase (table row actions, dialog shells, async lookups, three-perspective layout) over inventing a new variant, even a "cleaner" one. Consistency with what's already shipped beats a locally-better idea. See `table-view-pattern` for the table-specific instance of this rule.
3. **Framework/stack best practice** — React SPA idioms (controlled components, colocated state, composition over inheritance) only when tiers 1–2 don't already settle it.
4. **Personal preference** — lowest priority; defer to the above three before a stylistic preference.

This codebase already has hand-rolled, non-componentized tables predating the `DataTableActions`/`DataTablePagination` primitives (e.g. some dashboard cards) — when extending one of those, prefer adopting the shared primitive over extending the hand-rolled markup, even though the page wasn't already using it. "Nearest existing pattern" means the dominant convention across the app, not whichever local file happens to be open.

## Key Component Rules

| Component | Rule |
|---|---|
| Date/Time Pickers | Use `ResponsiveDateTimePicker` (or `DatePicker`/`DateTimePicker`) from `@eridu/ui`, not native `<input type="date">` |
| Date Range Filters | One semantic interval uses one `DatePickerWithRange`; do not expose separate from/to `DatePicker` controls unless the two bounds have different domain meanings |
| Filter-Dense Toolbars | Two or more secondary filters live behind one `Filters` trigger: `Popover` on desktop and `Sheet`/`Drawer` on mobile. Keep search, refresh, page size, and primary actions outside because they are not secondary filters |
| Mobile-visible Dialogs | Render as `Drawer` (vaul) below `md`; share body with the desktop `Dialog`. Default to `ResponsiveDateTimePicker` and the responsive dialog pattern for any new dialog reachable on mobile |
| Async Lookup Fields | 2+ `AsyncCombobox` in same form → extract each into `memo()` field component |
| Select vs. Combobox | A select-style field backed by more than ~5 options (entities like clients, creators, templates, mechanics — anything that can grow) must use `AsyncCombobox` (search-as-you-type, server-paginated), not the native `Select`. A flat `<Select>` rendering every option client-side doesn't scale once a studio has dozens of clients and forces an unbounded fetch to populate it. Reserve plain `Select` for genuinely small, fixed enums (status, role, a handful of literal choices). See `task-template-builder.tsx`'s client-binding combobox (search state + `useQuery` + `AsyncCombobox`) as the canonical pattern — reuse it rather than re-deriving it per page. |
| Searchable Inputs | `onSearch` must update query state — never leave as no-op |
| Refresh Buttons | Icon-only (`RotateCw`) + `aria-label` + spinning state while fetching |
| Collapsible Sections | `ChevronUp`/`ChevronDown` toggle, smooth animated transitions |
| Cross-Field Form Invariants | When BE Zod `superRefine` ties one field's value to another's, build the payload through a `buildXxxPayload(form)` helper that **clears irrelevant fields** (don't trust user residue). Disable the irrelevant inputs. Never submit raw state directly. |
| Loading / `Suspense` fallback | Use the shared, **composable** `LoadingPage` / `LoadingSpinner` from `@eridu/ui` — don't hand-roll loading divs. `LoadingPage` takes `label` (caption), `className` (fit a region), and `children` (compose extra content); prefer extending it over a bespoke loader. A code-split `Suspense` fallback must stay in the **eager** shell to render during its child's load, so keep it a dependency-free spinner — **don't add Lottie/heavy animation libs to a fallback** (it bloats the bundle the split is shrinking; reserve Lottie for a deliberate branded splash, never a fallback). |

## Responsive Dialog → Drawer Pattern

On viewports below the `md` breakpoint (768px), Radix `Popover`/`Dialog` content frequently overflows the viewport or clips inside parent dialogs. House rule:

- **Desktop (≥ md)**: render the desktop primitive (`Dialog`, `Popover`).
- **Mobile (< md)**: render a vaul `Drawer` with the same body, switched via `useIsMobile()` from `@eridu/ui`.
- **One body, two shells**: extract the form/picker body into a shared internal component; never duplicate logic between Dialog and Drawer.
- **`erify_studios` wrapper**: use `apps/erify_studios/src/components/responsive-dialog.tsx` for app-local Dialog → Drawer conversions before hand-rolling the shell in feature code. It owns the `aria-describedby` suppression — never re-add that prop on top of it.
- **Docked-panel variant**: when the desktop shell needs to be a right-docked `Sheet` rather than a centered `Dialog` (e.g. a review/detail panel next to a list, not a modal), use `apps/erify_studios/src/components/responsive-sheet.tsx` — same `useIsMobile()` swap and mobile `Drawer` body, `Sheet`/`SheetContent` instead of `Dialog`/`DialogContent` on desktop. Mirror its structure for new Sheet-based panels rather than re-deriving the swap from scratch.
- **Precedent**: `ResponsiveDateTimePicker` in `packages/ui/src/components/date-picker.tsx`; `ScheduleConflictReviewPanel` (`apps/erify_studios/src/features/shows/components/schedule-conflict-review-panel.tsx`) for the Sheet variant.

Applies to: every dialog reachable on a mobile route (actuals editing, shift compensation, task forms, json-form modals, schedule dialogs). Plain confirmations with one button can stay as `Dialog` — escalate when the dialog contains forms, pickers, multi-step content, or anything wider than ~280px.

> Migration guide + code recipe: [references/ui-component-details.md#responsive-dialog-pattern](references/ui-component-details.md#responsive-dialog-pattern).

## Three-Perspective UI Pattern for Entity Features

When designing a feature scoped to an **identity-bearing entity** — `Creator`, studio `Member` (manager / operator / account-manager), or `Show` — consider how it lands across **three perspectives**. The pattern is a design checklist, not a global mandate: each PRD decides which of the three a given sub-PR delivers, defers, or skips.

1. **Studio Overview (Perspective 1)**: Aggregate dashboards, filtered grids, and operations tables (e.g. `/task-review`, `/show-run-review`, `/task-setup`, creator/member roster tables). Manager-facing, studio-wide visibility.
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

### Entity Detail Route Layout Standard

For Studio Individual Overview routes such as `/studios/:studioId/creators/:creatorId`,
`/studios/:studioId/members/:memberId`, `/studios/:studioId/shifts/:shiftId`, and
`/studios/:studioId/shows/:showId`:

- Name the first tab for the **entity kind**, never `Defaults`:
  - **Profile** for identity/people entities — creator, member, shift (a member's roster row).
  - **Details** for record entities — show. Field labels can still say `Default Rate` or
    similar when they describe stored operational defaults, but the user-facing first tab
    reads as the entity profile/detail page.
- Split additional concerns into their own tabs by domain rather than overloading the first
  tab. The show detail route (14c, extended by PR 21.7) is the reference: **Details**
  (attributes) · **Actuals** (operational metrics) · **Performance** (platform GMV/views/CTR/CTO)
  · **Compensation** (costs) · **Submitted Tasks** (the former standalone task checklist, now a
  tab). People entities typically use **Profile · Compensation**.
- Use the in-content header pattern from the show tasks route
  (`shows/$showId/tasks` / `ShowHeaderSection`): compact icon-only back
  link, entity title / subtitle, and a metadata panel above the tabs.
- Avoid putting entity-detail back navigation in `PageLayout.actions`; it is
  less consistent with adjacent detail routes and less clear on mobile.
- **Mobile Tabs Overflow**: To prevent tab navigation links from breaking containment or causing whole-page horizontal overflow on narrow mobile viewports (e.g. 375px screens like iPhone SE), wrap the navigation container in a horizontally scrollable container with hidden scrollbars: `overflow-x-auto scrollbar-none flex-nowrap scroll-smooth` and style each link as `shrink-0`.

### Reusable Unit Component Standard
To prevent code duplication and logic drift across these three views, **extract and share core unit components**. Component wrappers should simply configure the appropriate API filters and role context before passing them to the shared visual unit:
- `ActualsTimelineViewer`: Shared timeline block visualizing planned vs actual times.
- `ShowRunSummary`: Shared range summary for submitted and signed-off show runs, creator attendance, phase checks, and active platform issues.
- `PerformanceMetricsWidget`: Graphical/tabular widget detailing analytical platform statistics (GMV, views, CTR, CTO) (shipped in PR 21.6/7).
- `CompensationBreakdownCard`: Shared card computing base compensation, commissions, and line items.
- `AttendanceStatusBadge`: Shared visual badge translating `actualStartTime` and `Show.startTime` into colored status highlights.
- `AuditLogTimeline`: Polymorphic audit log history renderer.

Ensure that any new feature touching operational entities adheres to this three-perspective layout from day one.

## Form Contract Coverage

- Compare intended UX against shared API schema before implementation
- Document any omitted contract fields with product rationale
- Date fields: `DatePicker`; datetime: `ResponsiveDateTimePicker` for mobile-reachable surfaces, `DateTimePicker` otherwise
- Native date inputs only with documented exception

## Control-Composition Consistency

Before composing a toolbar, form, or review surface, inspect the nearest same-purpose shipped
screen and the shared primitive that owns the interaction. Inventory each control as primary
search, secondary filter, view control, or action before choosing components.

- Use semantic controls rather than exposing transport fields: a URL/API `*_from` + `*_to`
  pair that represents one interval is one `DatePickerWithRange` in the UI.
- Consolidate two or more secondary filters into one responsive `Filters` surface with an
  active-filter count and one reset action. Do not make users scan multiple adjacent dropdowns.
- Keep page size, refresh, export, and create actions outside the filter surface. Resetting
  filters must not reset those independent view controls.
- When no equivalent exists, run `ui-mockup-discussion`; otherwise follow the existing pattern
  directly and record the reference in the implementation or PR evidence.

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
- [ ] One semantic date interval uses one `DatePickerWithRange`, not separate from/to controls
- [ ] Two or more secondary filters are consolidated behind one responsive `Filters` trigger; view controls stay outside and survive filter reset
- [ ] Datetime pickers on mobile-reachable forms use `ResponsiveDateTimePicker`
- [ ] Mobile-reachable Dialogs render as `Drawer` below `md` (responsive dialog → drawer pattern) with a shared body
- [ ] `erify_studios` mobile-reachable forms use the app-local `ResponsiveDialog` wrapper unless a feature needs custom shell behavior
- [ ] 2+ async lookups → isolated `memo()` field components
- [ ] `onSearch` wired to real search state
- [ ] Cross-field invariants enforced via `buildXxxPayload` helper + disabled inputs (not by trusting form state on submit)
- [ ] Entity features designed against the three perspectives (Studio Overview, Studio Individual Overview for creators/members/shows, Individual `/me/*` self-view) — perspectives in scope share one set of widgets; perspectives out of scope are an explicit PRD decision, not an oversight
- [ ] Entity detail routes use an in-content task-setup-style header and an entity-appropriate first tab (`Profile` for people entities, `Details` for record entities like shows) rather than `Defaults`

## Related Skills

- [frontend-code-quality](../frontend-code-quality/SKILL.md) — Quality standards
- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) — Tech stack
