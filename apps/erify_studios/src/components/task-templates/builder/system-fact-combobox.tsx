import { Check, ChevronsUpDown } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { SYSTEM_FACT_NONE_VALUE, SYSTEM_FACT_OPTIONS } from './field-editor.utils';
import type { SystemFactKey } from './schema';
import { SYSTEM_FACT_KEY_DEFINITIONS } from './schema';

/**
 * Searchable picker for binding a task field to a system-fact record column.
 * Emits the raw selected value (or the "none" sentinel) via `onChange`; the
 * field editor maps that to the field's type/validation side effects.
 */
export const SystemFactCombobox = memo(({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: SystemFactKey | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selectedFact = value ? SYSTEM_FACT_KEY_DEFINITIONS[value] : undefined;
  const buttonText = selectedFact?.label ?? 'None';

  const handleSelect = useCallback((nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between gap-2"
        >
          <span className="min-w-0 flex-1 truncate text-left">{buttonText}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search saved value..." />
          <CommandList>
            <CommandEmpty>No saved value found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="None" onSelect={() => handleSelect(SYSTEM_FACT_NONE_VALUE)}>
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value ? 'opacity-0' : 'opacity-100',
                  )}
                />
                None
              </CommandItem>
              {SYSTEM_FACT_OPTIONS.map((fact) => (
                <CommandItem
                  key={fact.value}
                  value={`${fact.label} ${fact.value} ${fact.description}`}
                  onSelect={() => handleSelect(fact.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === fact.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="min-w-0 truncate">{fact.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
SystemFactCombobox.displayName = 'SystemFactCombobox';
