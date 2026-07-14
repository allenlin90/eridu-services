# Frontend UI Components — Detailed References

Extended code examples and component patterns.

## Date and Time Pickers

```typescript
import { DatePicker, DateTimePicker, ResponsiveDateTimePicker } from '@eridu/ui';

// ✅ Desktop-only or always-narrow surface
<DateTimePicker value={dateTimeStr} onChange={setDateTimeStr} />

// ✅ Mobile-reachable surface (forms, dialogs visible on phone routes)
<ResponsiveDateTimePicker
  value={dateTimeStr}
  onChange={setDateTimeStr}
  label="Actual start"
/>

// ❌ BAD (Avoid native inputs)
<input type="date" value={dateStr} />
```

`ResponsiveDateTimePicker` renders the same Popover on desktop and a vaul `Drawer` below the `md` breakpoint, so the picker never overflows on phone-class viewports. Native browser date/datetime inputs require a documented reason.

## Responsive Dialog Pattern

Below the `md` breakpoint (`useIsMobile()` returns `true`), Radix `Popover`/`Dialog` content frequently overflows or clips, especially when nested or anchored near a viewport edge. House rule: **desktop Dialog → mobile Drawer**, sharing one body component.

### When to apply

Apply when the dialog/popover is reachable from a route that renders on phone-class viewports AND any of:

- Contains a form with two or more fields
- Contains a date/datetime picker, async combobox, or calendar
- Contains a multi-step flow, table, or chart
- Has content wider than ~280px at its natural size

Skip (keep plain `Dialog`) when:

- Plain confirmation with one or two buttons
- Static informational modal that fits within a 320px column
- Surface is never rendered below the `md` breakpoint (e.g., admin-only desktop tools)

### Recipe

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  useIsMobile,
} from '@eridu/ui';

type FormBodyProps = { value: string; onChange: (v: string) => void };

function FeatureFormBody({ value, onChange }: FormBodyProps) {
  // shared body — never duplicated between Dialog and Drawer
  return <div className="space-y-4">{/* fields */}</div>;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /* domain props */
};

export function FeatureFormDialog({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Feature title</DrawerTitle>
            <DrawerDescription>Short description.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <FeatureFormBody {/* ...props */} />
          </div>
          <DrawerFooter>
            <Button onClick={/* submit */}>Save</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Feature title</DialogTitle>
          <DialogDescription>Short description.</DialogDescription>
        </DialogHeader>
        <FeatureFormBody {/* ...props */} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={/* submit */}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Rules:

- The form/picker body MUST be one shared component. Never copy logic between Dialog and Drawer branches.
- Drawer titles/descriptions are required for accessibility — use `sr-only` text if the visible header is implicit.
- Drawers steal focus and lock scroll via vaul; the desktop Dialog does the same via Radix. Do not nest a Drawer inside another modal unless you have verified focus management.
- Keep one `useIsMobile()` call at the component root — do not branch deep in the tree.
- Test at iPhone SE (375×667) before merging any responsive dialog.

### Reference implementation

- `packages/ui/src/components/date-picker.tsx` — `ResponsiveDateTimePicker` (shared body via `DateTimePickerBody`, Popover on desktop, vaul Drawer on mobile)
- `apps/erify_studios/src/components/responsive-dialog.tsx` — app-local responsive Dialog → Drawer shell for feature forms and modal workflows. Handles the `aria-describedby` suppression internally (see below), so consumers never re-add it.
- Consumers (`erify_studios`): `studio-shows/components/show-actuals-dialog.tsx`, `admin/components/admin-form-dialog.tsx`, `schedules/components/schedule-dialogs.tsx`, `shows/components/bulk-task-generation-dialog.tsx`, `tasks/components/task-due-date-dialog.tsx`, `tasks/components/system-task-details-dialog.tsx`, `studio-shifts/components/shift-compensation-dialog.tsx`

### Migration guide for existing Dialogs

1. Identify the form/content body inside `DialogContent`.
2. Extract it to a sibling component (`FeatureFormBody`) — no behavior change.
3. Add a `useIsMobile()` switch at the component root.
4. Wire the same `open`/`onOpenChange` to both `Dialog` and `Drawer`.
5. Match `DialogHeader`/`DialogFooter` content in `DrawerHeader`/`DrawerFooter` (keep the same primary action label).
6. Mobile-verify at 375×667: every interactive element reachable, no off-screen content, keyboard does not push controls under the viewport edge.

For `erify_studios`, prefer the app-local `ResponsiveDialog` wrapper when the modal fits the standard shape (`title`, optional `description`, body, optional footer). Keep a custom shell only when the component needs unusual scroll regions, nested focus behavior, or route-specific chrome. The wrapper is forgiving enough that most "I need a custom shell" instincts are wrong — `title` + `description` + body + a `footer` of action buttons covers task-due-date, system-task-details, shift-compensation, and the admin/schedule/show-actuals forms.

#### `aria-describedby` suppression (don't hand-roll it)

Radix `DialogContent` sets `aria-describedby={context.descriptionId}` then spreads your props **after**, so passing an explicit `aria-describedby={undefined}` drops the attribute and silences the "Missing `Description`" console warning. But that same explicit `undefined` also **breaks the auto-association when a description IS rendered** (screen readers lose the description). So the rule is conditional: inject `aria-describedby={undefined}` only when there is no description; omit the prop entirely when there is one. `ResponsiveDialog` already does this — consumers must NOT re-add `aria-describedby` on top of it. Only hand-rolled `Dialog`/`Drawer` shells (e.g. a one-button confirmation that intentionally has no description) need the inline `aria-describedby={undefined}`.

## Async Lookup Field Isolation

When a form has 2+ `AsyncCombobox` fields, each MUST be extracted into its own `memo()` component.

```tsx
// ❌ BAD: hooks at form level — every setSearch re-renders the whole form
export function MyForm({ show, studioId }) {
  const { options: clientOptions, setSearch: setClientSearch } = useClientOptions(show, studioId);
  const { options: typeOptions, setSearch: setTypeSearch } = useTypeOptions(show, studioId);
  return <form>...</form>;
}

// ✅ GOOD: each field owns its hook — re-renders are isolated
const ClientField = memo(({ control, show, studioId }: FieldProps) => {
  const { options, isLoading, setSearch } = useClientOptions(show, studioId);
  return (
    <FormField
      control={control}
      name="client_id"
      render={({ field }) => (
        <AsyncCombobox value={field.value} onChange={field.onChange} onSearch={setSearch} options={options} isLoading={isLoading} />
      )}
    />
  );
});
```

Rules:
- Field components in `components/` subfolder alongside the form
- `useWatch` for field-level derived state lives inside the field component, not parent
- Reference: `apps/erify_studios/src/features/shows/components/show-form-fields.tsx`

## Searchable Lookup Inputs

Rules:
- Planning: list each searchable field and data source
- `onSearch` must update query state or documented local filter — never leave as no-op
- Keep same-form lookup behavior consistent
- Dead search wiring = incomplete implementation

## Refresh Actions

```typescript
<Button type="button" variant="outline" size="icon" className="h-9 w-9"
  onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh data">
  <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
</Button>
```

## Collapsible Section Toggle

- Expanded: `ChevronUp` / Collapsed: `ChevronDown`
- Smooth animated collapse/expand with `overflow-hidden transition-all duration-300 ease-in-out`
- `aria-hidden` when collapsed

## Cross-Field Form Invariants

When a BE Zod schema uses `superRefine` to gate one field on another's value (e.g. `commission_rate` must be `null` when `compensation_type` is `FIXED`), three things must happen on the FE:

1. **A `buildXxxPayload(form)` helper** owns the cross-field invariant — it forces irrelevant fields to `null` and validates required ones. The submit handler calls only this helper; never builds the payload inline from raw state.
2. **The irrelevant input is `disabled`** when the gating field's value would make it nullable — so users see why their input is being ignored. Bind `value={enabled ? state : ''}` so the displayed value also clears.
3. **Unit tests cover each transition** (e.g. HYBRID → FIXED with a leftover non-null commission rate must produce `commission_rate: null`).

The bug this prevents: when a user switches type from `HYBRID` to `FIXED` without clearing the commission input, a naive `normalizeOptionalMoneyInput("0")` returns `"0.00"` (not `null`), so the BE `superRefine` rejects the payload.

```typescript
// apps/erify_studios/src/features/studio-show-creators/lib/show-creator-assignment-terms.ts
export function buildShowCreatorAssignmentTermsPayload(form: Form): UpdatePayload {
  const compensationType = form.compensationType === NO_COMPENSATION_TYPE ? null : form.compensationType;
  const agreedRate = isAgreedRateEnabled(form.compensationType) ? normalize(form.agreedRate) : null;
  const commissionRate = isCommissionRateEnabled(form.compensationType) ? normalize(form.commissionRate) : null;
  // ...required-field assertions, trim, return shape
}
```

Canonical examples in-repo:

- `apps/erify_studios/src/features/studio-show-creators/lib/show-creator-assignment-terms.ts` (per-show creator compensation)
- `apps/erify_studios/src/features/studio-creator-roster/lib/studio-creator-compensation.ts` (roster defaults)

The invariant table that drives these helpers is in [`docs/domain/economics-cost-model.md`](../../../../docs/domain/economics-cost-model.md#cross-field-validation-invariants).

## Composition Over Large Components

Build complex UIs by composing small, focused components.

## Using Children for Composition

Use the `children` prop for flexible, composable components (Dialog, Layout, etc.).

## Wrapping 3rd Party Components

Wrap to add app-specific behavior and make future changes easier.

## When to Abstract to `@eridu/ui`

1. Used in multiple apps
2. Generic and reusable (no business logic)
3. Stable API
4. Well-tested

Don't abstract too early — wait for 2-3 use cases.
