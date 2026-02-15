import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'> & {
    onCheckedChange?: (checked: boolean) => void;
    checked?: boolean;
  }
>(({ className, checked, onCheckedChange, ...props }, ref) => (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          ref={ref}
          onClick={() => onCheckedChange?.(!checked)}
          className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex items-center justify-center',
            checked && 'bg-primary text-primary-foreground',
            className,
          )}
          {...props}
        >
          {checked && <Check className="h-3 w-3" />}
        </button>
      ));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
