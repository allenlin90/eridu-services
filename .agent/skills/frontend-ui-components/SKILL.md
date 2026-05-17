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

## Responsive Dialog → Drawer Pattern

On viewports below the `md` breakpoint (768px), Radix `Popover`/`Dialog` content frequently overflows the viewport or clips inside parent dialogs. House rule:

- **Desktop (≥ md)**: render the desktop primitive (`Dialog`, `Popover`).
- **Mobile (< md)**: render a vaul `Drawer` with the same body, switched via `useIsMobile()` from `@eridu/ui`.
- **One body, two shells**: extract the form/picker body into a shared internal component; never duplicate logic between Dialog and Drawer.
- **Precedent**: `ResponsiveDateTimePicker` in `packages/ui/src/components/date-picker.tsx`.

Applies to: every dialog reachable on a mobile route (actuals editing, shift compensation, task forms, json-form modals, schedule dialogs). Plain confirmations with one button can stay as `Dialog` — escalate when the dialog contains forms, pickers, multi-step content, or anything wider than ~280px.

> Migration guide + code recipe: [references/ui-component-details.md#responsive-dialog-pattern](references/ui-component-details.md#responsive-dialog-pattern).

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

## Related Skills

- [frontend-code-quality](../frontend-code-quality/SKILL.md) — Quality standards
- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) — Tech stack
