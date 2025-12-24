import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { AppSidebar } from '@eridu/ui';
import { SidebarInset, SidebarProvider } from '@eridu/ui/components/ui/sidebar';

import { SidebarLayoutHeader } from './sidebar-layout-header';

import { useSidebarConfig } from '@/config/sidebar-config';
import { useSession } from '@/lib/session-provider';

type SidebarLayoutProps = {
  children: ReactNode;
};

// Adapter for TanStack Router's Link to be used in generic UI components
function RouterLink({ href, ...props }: React.ComponentProps<typeof Link>) {
  return <Link to={href} {...props} />;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { session } = useSession();
  const sidebarConfig = useSidebarConfig(session);

  return (
    <SidebarProvider>
      <AppSidebar {...sidebarConfig} linkComponent={RouterLink} />
      <SidebarInset>
        <SidebarLayoutHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
