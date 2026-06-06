import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, Popover, PopoverContent, PopoverTrigger } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

// Option type can be simple { label, value }
export type MultiSelectOption = { label?: string; value: string };

type MultiSelectProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function MultiSelect({ options, value, onChange, placeholder = 'Select options...', className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = Array.isArray(value) ? value : [];
  const validOptions = options?.filter((opt) => opt.value) || [];

  const handleSelect = (val: string) => {
    const newSelected = selected.includes(val)
      ? selected.filter((item) => item !== val)
      : [...selected, val];
    onChange(newSelected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between h-auto min-h-10', className)}>
          <div className="flex flex-wrap gap-1">
            {selected.length > 0
              ? (
                  selected.map((val) => (
                    <Badge key={val} variant="secondary" className="mr-1">
                      {validOptions.find((opt) => opt.value === val)?.label || val}
                      <div
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSelect(val);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => handleSelect(val)}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </div>
                    </Badge>
                  ))
                )
              : (
                  <span className="text-muted-foreground font-normal">{placeholder}</span>
                )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {validOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label || option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selected.includes(option.value) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.label || option.value}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
