import { Copy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '../lib/utils';

import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export type CopyableTextProps = {
  /**
   * The text value to display and copy to clipboard
   */
  value: string;
  /**
   * Optional className for the container div (merged with defaults)
   */
  className?: string;
  /**
   * Optional max-width for truncation
   * @default '400px'
   */
  maxWidth?: string;
  /**
   * Optional custom display text (if different from copy value)
   */
  displayValue?: string;
  /**
   * Tooltip position
   * @default 'top'
   */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Duration to show copied state in milliseconds
   * @default 2000
   */
  copyDuration?: number;
  /**
   * Display variant
   * @default 'mono'
   */
  variant?: 'default' | 'mono';
};

export function CopyableText({
  value,
  className,
  maxWidth = '400px',
  displayValue,
  tooltipSide = 'top',
  copyDuration = 2000,
  variant = 'mono',
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }, [value]);

  // Cleanup timeout on unmount or when copied changes
  useEffect(() => {
    if (!copied)
      return;

    const timer = setTimeout(() => {
      setCopied(false);
    }, copyDuration);

    return () => clearTimeout(timer);
  }, [copied, copyDuration]);

  const textToDisplay = displayValue ?? value;

  return (
    <div
      className={cn('flex items-center gap-1.5 min-w-0 w-fit', className)}
      style={{ maxWidth }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'text-xs text-muted-foreground truncate min-w-0 transition-colors cursor-default',
              variant === 'mono' && 'font-mono',
            )}
          >
            {textToDisplay}
          </span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className={cn(variant === 'mono' && 'font-mono')}>
          {value}
        </TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 transition-all shrink-0 text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
        onClick={handleCopy}
        title={`Copy ${variant === 'mono' ? 'ID' : 'text'}`}
      >
        {copied
          ? (
              <span className="text-xs font-bold text-green-500">✓</span>
            )
          : (
              <Copy className="h-3 w-3" />
            )}
      </Button>
    </div>
  );
}
