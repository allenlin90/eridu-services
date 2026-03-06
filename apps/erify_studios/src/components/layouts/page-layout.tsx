import type { ReactNode } from 'react';

import { cn } from '@eridu/ui/lib/utils';

export type PageLayoutProps = {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageLayout({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn('flex flex-1 flex-col gap-4 p-4 pt-0', className)}>
      <div className="flex flex-col gap-4 sticky">
        {breadcrumbs && (
          <div>{breadcrumbs}</div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center justify-center sm:justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
