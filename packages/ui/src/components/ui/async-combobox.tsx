import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import * as React from 'react';

import { useDebounce } from '../../hooks/use-debounce';
import { cn } from '../../lib/utils';

import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';

export type Option = {
  value: string;
  label: string;
};

type AsyncComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  options: Option[];
  isLoading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
};

export function AsyncCombobox({
  value,
  onChange,
  onSearch,
  options,
  isLoading,
  placeholder = 'Select option...',
  emptyMessage = 'No option found.',
  className,
  disabled,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const onSearchRef = React.useRef(onSearch);

  const debouncedSearch = useDebounce(inputValue, 300);

  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  React.useEffect(() => {
    onSearchRef.current(debouncedSearch);
  }, [debouncedSearch]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between gap-2', className)}
          disabled={disabled}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {value
              ? selectedOption?.label ?? 'Select option...'
              : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading
              ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )
              : (
                  options.length === 0 && (
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                  )
                )}
            <CommandGroup>
              {!isLoading
              && options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use label for display/filtering if needed, though filtering is off
                  onSelect={() => {
                    onChange(option.value === value ? '' : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type AsyncMultiComboboxProps = {
  value?: string[];
  onChange: (value: string[]) => void;
  onSearch: (value: string) => void;
  options: Option[];
  isLoading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
};

export function AsyncMultiCombobox({
  value = [],
  onChange,
  onSearch,
  options,
  isLoading,
  placeholder = 'Select options...',
  emptyMessage = 'No options found.',
  className,
  disabled,
}: AsyncMultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const onSearchRef = React.useRef(onSearch);

  const debouncedSearch = useDebounce(inputValue, 300);

  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  React.useEffect(() => {
    onSearchRef.current(debouncedSearch);
  }, [debouncedSearch]);

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-auto min-h-10', className)}
          disabled={disabled}
        >
          {value.length > 0
            ? (
                <div className="flex flex-wrap gap-1">
                  {value.length}
                  {' '}
                  selected
                </div>
              )
            : (
                placeholder
              )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading
              ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )
              : (
                  options.length === 0 && (
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                  )
                )}
            <CommandGroup>
              {!isLoading
              && options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
