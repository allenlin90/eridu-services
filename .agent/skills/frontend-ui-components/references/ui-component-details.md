# Frontend UI Components — Detailed References

Extended code examples and component patterns.

## Date and Time Pickers

```typescript
import { DatePicker, DateTimePicker } from '@eridu/ui/components/date-picker';

// ✅ GOOD
<DatePicker value={dateStr} onChange={setDateStr} />
<DateTimePicker value={dateTimeStr} onChange={setDateTimeStr} />

// ❌ BAD (Avoid native inputs)
<input type="date" value={dateStr} />
```

Native browser date/datetime inputs require a documented reason.

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
    <FormField control={control} name="client_id" render={({ field }) => (
      <AsyncCombobox value={field.value} onChange={field.onChange} onSearch={setSearch} options={options} isLoading={isLoading} />
    )} />
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
