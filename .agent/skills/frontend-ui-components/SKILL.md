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
| Date/Time Pickers | Use `DatePicker`/`DateTimePicker` from `@eridu/ui`, not native `<input type="date">` |
| Async Lookup Fields | 2+ `AsyncCombobox` in same form → extract each into `memo()` field component |
| Searchable Inputs | `onSearch` must update query state — never leave as no-op |
| Refresh Buttons | Icon-only (`RotateCw`) + `aria-label` + spinning state while fetching |
| Collapsible Sections | `ChevronUp`/`ChevronDown` toggle, smooth animated transitions |

## Form Contract Coverage

- Compare intended UX against shared API schema before implementation
- Document any omitted contract fields with product rationale
- Date fields: `DatePicker`, datetime: `DateTimePicker`
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
- [ ] Date fields use `DatePicker` / `DateTimePicker`
- [ ] 2+ async lookups → isolated `memo()` field components
- [ ] `onSearch` wired to real search state

## Related Skills

- [frontend-code-quality](../frontend-code-quality/SKILL.md) — Quality standards
- [frontend-tech-stack](../frontend-tech-stack/SKILL.md) — Tech stack
