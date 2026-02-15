import type { ReactNode } from 'react';

import { cn } from '@eridu/ui/lib/utils';

export type ResponsiveCardGridProps = {
  children: ReactNode;
  /** Minimum card width (default: 17.5rem / 280px) */
  minCardWidth?: string;
  /** Gap between cards (default: 1.5rem / 24px) */
  gap?: string;
  className?: string;
};

/**
 * A responsive grid that auto-fills cards based on available width.
 * Uses CSS Grid with `auto-fill` and `minmax` for fluid responsiveness.
 *
 * @example
 * ```tsx
 * <ResponsiveCardGrid>
 *   {items.map(item => <Card key={item.id} {...item} />)}
 * </ResponsiveCardGrid>
 * ```
 */
export function ResponsiveCardGrid({
  children,
  minCardWidth = '17.5rem',
  gap = '1.5rem',
  className,
}: ResponsiveCardGridProps) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minCardWidth}), 1fr))`,
        gap,
      }}
    >
      {children}
    </div>
  );
}
