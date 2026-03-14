import type { ReactNode } from 'react';

import { cn } from '@eridu/ui/lib/utils';

const PAGE_CONTAINER_CLASS = 'flex flex-1 flex-col gap-4 p-4 pt-2';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn(PAGE_CONTAINER_CLASS, className)}>
      {children}
    </div>
  );
}
