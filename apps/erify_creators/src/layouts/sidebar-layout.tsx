import type { ReactNode } from 'react';

import { AppSidebar } from '@eridu/ui';
import { SidebarInset, SidebarProvider } from '@eridu/ui/components/ui/sidebar';

import { SidebarLayoutHeader } from './sidebar-layout-header';

import { useSidebarConfig } from '@/config/sidebar-config';
import { useSession } from '@/lib/session-provider';

type SidebarLayoutProps = {
  children: ReactNode;
};

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { session } = useSession();
  const sidebarConfig = useSidebarConfig(session);

  return (
    <SidebarProvider>
      <AppSidebar {...sidebarConfig} />
      <SidebarInset>
        <SidebarLayoutHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
