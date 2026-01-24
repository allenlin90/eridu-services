'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';

import { Button, Input } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { SearchInputProps } from './types';

/**
 * Debounced search input with search icon and clear button
 */
export function SearchInput({
  value: externalValue,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(externalValue);
  const [prevExternalValue, setPrevExternalValue] = React.useState(externalValue);

  // Sync with external value changes (derived state pattern)
  if (externalValue !== prevExternalValue) {
    setInternalValue(externalValue);
    setPrevExternalValue(externalValue);
  }

  // Debounced update to parent
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== externalValue) {
        onChange(internalValue);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [internalValue, externalValue, onChange]);

  const handleClear = () => {
    setInternalValue('');
    onChange('');
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 h-9"
      />
      {internalValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
