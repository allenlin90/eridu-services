'use client';

import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { NavMain } from '@eridu/ui/components/nav-main';
import { NavUser } from '@eridu/ui/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@eridu/ui/components/ui/sidebar';

export type SidebarNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

export type SidebarUser = {
  name: string;
  email: string;
  avatar: string;
};

export type SidebarHeaderContent = {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  subtitle?: string;
  url?: string;
};

export type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  header?: SidebarHeaderContent | React.ReactNode;
  navMain: SidebarNavItem[];
  navMainLabel?: string;
  user?: SidebarUser;
  footer?: React.ReactNode;
  onLogout?: () => void | Promise<void>;
};

export function AppSidebar({
  header,
  navMain,
  navMainLabel,
  user,
  footer,
  onLogout,
  ...props
}: AppSidebarProps) {
  const renderHeader = () => {
    if (!header)
      return null;

    // If header is a ReactNode, render it directly
    if (React.isValidElement(header)) {
      return header;
    }

    // If header is SidebarHeaderContent object, render default header
    const headerContent = header as SidebarHeaderContent;
    const IconComponent = headerContent.icon;

    const renderIcon = () => {
      if (!IconComponent)
        return null;

      // If it's already a React element, render it directly
      if (React.isValidElement(IconComponent)) {
        return IconComponent;
      }

      // If it's a Lucide icon component (function), render it as JSX
      if (typeof IconComponent === 'function') {
        return (
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <IconComponent className="size-4" />
          </div>
        );
      }

      return null;
    };

    const headerContentElement = (
      <>
        {renderIcon()}
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">
            {headerContent.title}
          </span>
          {headerContent.subtitle && (
            <span className="truncate text-xs">
              {headerContent.subtitle}
            </span>
          )}
        </div>
      </>
    );

    return (
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild={!!headerContent.url}>
              {headerContent.url
                ? (
                    <a href={headerContent.url}>
                      {headerContentElement}
                    </a>
                  )
                : (
                    headerContentElement
                  )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
    );
  };

  const renderFooter = () => {
    if (footer)
      return <SidebarFooter>{footer}</SidebarFooter>;
    if (user) {
      return (
        <SidebarFooter>
          <NavUser user={user} onLogout={onLogout} />
        </SidebarFooter>
      );
    }
    return null;
  };

  return (
    <Sidebar variant="inset" {...props}>
      {renderHeader()}
      <SidebarContent>
        <NavMain items={navMain} label={navMainLabel} />
      </SidebarContent>
      {renderFooter()}
    </Sidebar>
  );
}
