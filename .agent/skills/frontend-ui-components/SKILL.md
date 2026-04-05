---
name: frontend-ui-components
description: Provides guidelines for using shared UI components and styling. This skill should be used when implementing UI features using Shadcn/Radix components and the shared @eridu/ui package.
---

# Frontend UI Components

This skill outlines how to build and use UI components in the frontend applications, leveraging the shared `@eridu/ui` package and Shadcn patterns.

## The `@eridu/ui` Package

All generic UI components (Buttons, Inputs, Dialogs, etc.) live in `packages/ui`. Do NOT create local copies of generic components in apps.

### Usage

```typescript
import { Button } from '@eridu/ui/components/button';
import { Input } from '@eridu/ui/components/input';

export function MyForm() {
  return (
    <div className="flex gap-4">
      <Input placeholder="Search..." />
      <Button variant="default">Search</Button>
    </div>
  );
}
```

### Specific Component Guidelines

#### Date and Time Pickers
Always use the custom `DatePicker` and `DateTimePicker` components from `@eridu/ui` instead of native `<input type="date">` or `<input type="datetime-local">` unless there is a highly specific and unavoidable requirement to use the native browser inputs. This ensures visual consistency, cross-browser compatibility, and a better user experience across the application.

```typescript
import { DatePicker, DateTimePicker } from '@eridu/ui/components/date-picker';

// ✅ GOOD
<DatePicker value={dateStr} onChange={setDateStr} />
<DateTimePicker value={dateTimeStr} onChange={setDateTimeStr} />

// ❌ BAD (Avoid native inputs)
<input type="date" value={dateStr} />
```

Review rule:
- Native browser date/datetime inputs require a documented reason in the design doc or a short inline code comment at the usage site.
- "Faster to wire up" or "browser default is fine" is not a sufficient reason.

#### Form Contract Coverage
For CRUD forms, dialogs, and sheets backed by shared API schemas or feature design docs, start by inventorying the full intended field set before implementation.

Rules:
- Planning: compare the intended UX against the shared contract/design doc and record any exclusions up front.
- Implementation: do not silently omit user-editable fields from the form just because they are optional, inconvenient, or hidden by an `.omit()` call.
- If a field is intentionally excluded from the UX (for example `external_id` or advanced metadata), document the reason in the relevant design doc and leave a short comment near the form/schema composition point.
- Review: treat undocumented field omissions as product/contract drift, not as harmless cleanup.

Checklist for form work:
- [ ] Form field inventory reviewed against the shared API schema and feature doc.
- [ ] Any omitted contract field has an explicit product rationale.
- [ ] Date fields use `DatePicker` from `@eridu/ui`.
- [ ] Datetime fields use `DateTimePicker` from `@eridu/ui`.
- [ ] Native `date` / `datetime-local` inputs appear only with a documented exception.

#### Searchable Lookup Inputs
Any control that visually advertises search, especially `AsyncCombobox` and `AsyncMultiCombobox`, needs an explicit per-field search contract before implementation.

Rules:
- Planning: list each searchable field and whether it should use a scoped API endpoint or intentional client-side filtering of preloaded data.
- Implementation: do not leave `onSearch` as a no-op just to satisfy a prop shape. If the input is searchable, typing must either update query state or documented local filter state.
- Keep same-form lookup behavior consistent where possible. If five fields search remotely and one still uses a local bundle, that exception must be documented in the design doc with the backend gap called out.
- Review: treat dead search wiring, undocumented mixed parity, and “looks async but is really static” controls as incomplete implementation, not minor UX polish.

Checklist for searchable inputs:
- [ ] Each searchable control has an identified data source.
- [ ] `onSearch` updates live search state instead of using a placeholder callback.
- [ ] Remote lookup fields have query coverage or equivalent interaction test coverage.
- [ ] Any local-filter fallback is documented in the design doc and reflected in UX expectations.

#### Refresh Actions
Use icon-only refresh buttons for data refetch actions to keep toolbar density and interaction patterns consistent.

```typescript
import { RotateCw } from 'lucide-react';
import { Button } from '@eridu/ui/components/button';

<Button
  type="button"
  variant="outline"
  size="icon"
  className="h-9 w-9"
  onClick={onRefresh}
  disabled={isRefreshing}
  aria-label="Refresh data"
>
  <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
</Button>
```

Notes:
- Always provide an explicit `aria-label` (for accessibility and stable tests).
- Keep spinning state on the icon while fetching/refetching.
- In mobile overflow menus, text labels in dropdown items are still acceptable.

#### Collapsible Section Toggle Actions
For show/hide controls on collapsible UI sections, use a single shared icon pattern across the app:
- Expanded state: `ChevronUp`
- Collapsed state: `ChevronDown`

```typescript
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@eridu/ui/components/button';

<Button
  type="button"
  variant="outline"
  size="icon"
  aria-label={isOpen ? 'Collapse section' : 'Expand section'}
  onClick={toggle}
>
  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
</Button>
```

Notes:
- Keep the toggle icon button anchored in a consistent place (prefer top-right of section header) for both desktop and mobile.
- Do not substitute alternate semantic icons (for example `Eye` / `EyeOff`) for section collapse behavior.

#### Smooth Collapse/Expand Transition (for Toggleable Sections)
When a section is toggled, prefer smooth animated collapse/expand instead of hard unmount/remount.

```tsx
<div
  className={cn(
    'overflow-hidden transition-all duration-300 ease-in-out',
    isOpen ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
  )}
  aria-hidden={!isOpen}
>
  {content}
</div>
```

Notes:
- Keep the content mounted and animate container height/opacity for smoother UX.
- Use `overflow-hidden` to prevent clipping artifacts during height transition.
- Include `aria-hidden` when collapsed for better accessibility semantics.
- Keep duration/easing consistent (`duration-300`, `ease-in-out`) unless a route has an established alternative.

## Styling Pattern (Tailwind CSS v4)

We use **Tailwind CSS v4** with `clsx` and `tailwind-merge` for conditional styling.

### The `cn` Utility

Use the `cn` utility from `@eridu/ui/lib/utils` to merge classes safely.

```typescript
import { cn } from '@eridu/ui/lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}
```

## Component Design Patterns

### Composition Over Large Components

Build complex UIs by composing small, focused components instead of creating large monolithic components.

**Benefits**:
- Easier to test and maintain
- Better performance (smaller re-render scope)
- More reusable components
- Clearer separation of concerns

```typescript
// ❌ BAD: Large monolithic component
function UserDashboard() {
  return (
    <div>
      <header>{/* Complex header logic */}</header>
      <nav>{/* Complex navigation */}</nav>
      <main>
        <div>{/* User stats */}</div>
        <div>{/* Activity feed */}</div>
        <div>{/* Recommendations */}</div>
      </main>
      <footer>{/* Footer content */}</footer>
    </div>
  );
}

// ✅ GOOD: Composed from smaller components
function UserDashboard() {
  return (
    <div>
      <DashboardHeader />
      <DashboardNav />
      <main>
        <UserStats />
        <ActivityFeed />
        <Recommendations />
      </main>
      <DashboardFooter />
    </div>
  );
}
```

### Using Children for Composition

Use the `children` prop to create flexible, composable components.

```typescript
// Flexible Dialog component using composition
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@eridu/ui/components/dialog';

function ConfirmDeleteDialog({ isOpen, onClose, onConfirm }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to delete this item?</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Wrapping 3rd Party Components

Wrap 3rd party components to adapt them to your application's needs and make future changes easier.

```typescript
// Wrap Radix Link to add app-specific behavior
import { Link as RadixLink } from '@radix-ui/react-navigation-menu';
import { cn } from '@eridu/ui/lib/utils';

interface AppLinkProps extends React.ComponentPropsWithoutRef<typeof RadixLink> {
  external?: boolean;
}

export function Link({ external, className, children, ...props }: AppLinkProps) {
  return (
    <RadixLink
      className={cn('text-primary hover:underline', className)}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
      {external && <span className="ml-1">↗</span>}
    </RadixLink>
  );
}
```

### When to Abstract Components

Abstract components into the shared `@eridu/ui` package when:

1. **Used in multiple apps** - Component is needed across `erify_creators`, `erify_studios`, etc.
2. **Generic and reusable** - Not tied to specific business logic
3. **Stable API** - Interface is unlikely to change frequently
4. **Well-tested** - Component has proper tests and documentation

**Don't abstract too early**:
- Wait until you have 2-3 use cases before abstracting
- Avoid premature abstraction (wrong abstractions are worse than duplication)
- Keep feature-specific components in feature folders

## Creating New Components

When creating **app-specific** features:
1.  Compose them using primitives from `@eridu/ui`.
2.  Keep them in `src/components/{feature-name}/`.

When creating **new generic** primitives:
1.  Add them to `packages/ui/src/components/`.
2.  Follow the Radix UI + Tailwind pattern (Shadcn style).
3.  Export them via `packages/ui/package.json`.

## Checklist

- [ ] Import generic components from `@eridu/ui`.
- [ ] Use `cn()` for class merging.
- [ ] Ensure components are accessible (Radix UI primitives).
- [ ] Use Tailwind text/bg colors that map to the theme (e.g., `bg-primary`, `text-muted-foreground`).
