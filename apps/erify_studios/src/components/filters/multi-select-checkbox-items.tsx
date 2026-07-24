import { DropdownMenuCheckboxItem } from '@eridu/ui';

export type MultiSelectOption<T extends string> = {
  value: T;
  label: string;
};

type MultiSelectCheckboxItemsProps<T extends string> = {
  options: readonly MultiSelectOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
};

/**
 * Renders the `DropdownMenuCheckboxItem` list shared by the dropdown-style
 * multi-select filters (performance shows: show type / platform / show standard;
 * my-tasks: status / task type). Each item stays open on select (`preventDefault`)
 * and toggles a single value — the caller owns the trigger button, the
 * `DropdownMenuContent` wrapper, and how the toggled array is persisted.
 */
export function MultiSelectCheckboxItems<T extends string>({
  options,
  selected,
  onToggle,
}: MultiSelectCheckboxItemsProps<T>) {
  return (
    <>
      {options.map((option) => (
        <DropdownMenuCheckboxItem
          key={option.value}
          checked={selected.includes(option.value)}
          onCheckedChange={() => onToggle(option.value)}
          onSelect={(event) => event.preventDefault()}
        >
          {option.label}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}
