import { useIsFetching } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@eridu/ui';

type AdminLayoutProps = {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onRefresh?: () => void;
  refreshQueryKey?: readonly unknown[];
  breadcrumbs?: ReactNode;
  children: ReactNode;
};

export function AdminLayout({
  title,
  description,
  action,
  onRefresh,
  refreshQueryKey,
  breadcrumbs,
  children,
}: AdminLayoutProps) {
  // Always call hooks at the top level
  const fetchingCount = useIsFetching({ queryKey: refreshQueryKey || [] });
  const isFetching = refreshQueryKey ? fetchingCount > 0 : false;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-0">
      <div className="flex flex-col gap-4">
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
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isFetching}
              >
                <RotateCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            {action && (
              <Button onClick={action.onClick}>{action.label}</Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
