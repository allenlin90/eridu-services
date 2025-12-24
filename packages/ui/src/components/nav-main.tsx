import { ChevronRight, type LucideIcon } from 'lucide-react';
import type * as React from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@eridu/ui/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@eridu/ui/components/ui/sidebar';

export function NavMain({
  items,
  label,
  linkComponent: LinkComponent,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  label?: string;
  linkComponent?: React.ElementType;
}) {
  const renderMenuButtonContent = (item: { title: string; url: string; icon: LucideIcon }) => {
    if (LinkComponent) {
      return (
        <LinkComponent href={item.url}>
          <item.icon />
          <span>{item.title}</span>
        </LinkComponent>
      );
    }

    return (
      <a href={item.url}>
        <item.icon />
        <span>{item.title}</span>
      </a>
    );
  };

  const renderSubItemContent = (subItem: { title: string; url: string }) => {
    if (LinkComponent) {
      return (
        <LinkComponent href={subItem.url}>
          <span>{subItem.title}</span>
        </LinkComponent>
      );
    }

    return (
      <a href={subItem.url}>
        <span>{subItem.title}</span>
      </a>
    );
  };

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive} className="group/collapsible">
            <SidebarMenuItem>
              {item.items?.length
                ? (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  )
                : (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      {renderMenuButtonContent(item)}
                    </SidebarMenuButton>
                  )}

              {!!item.items?.length && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          {renderSubItemContent(subItem)}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
