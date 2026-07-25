import { Checkbox, Label } from '@eridu/ui';

export type FilterOption<T extends string> = {
  value: T;
  label: () => string;
};

type CheckboxFilterGroupProps<T extends string> = {
  idPrefix: string;
  label: string;
  options: FilterOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
};

/**
 * Inline (non-dropdown) multi-select checkbox group for consolidated filter
 * panels. Renders a labelled `fieldset` with a two-column checkbox grid. Options
 * carry lazy (`() => string`) labels so Paraglide message accessors can be passed
 * directly. Used by the schedule-publish impacts filter panel; available for any
 * future consolidated filter surface that wants the same inline shape.
 */
export function CheckboxFilterGroup<T extends string>({
  idPrefix,
  label,
  options,
  selected,
  onToggle,
}: CheckboxFilterGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${idPrefix}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-none">
                {option.label()}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
