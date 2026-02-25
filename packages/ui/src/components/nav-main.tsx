import { ChevronRight, ChevronsUpDown, type LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@eridu/ui/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupAction,
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
      icon?: LucideIcon;
      isActive?: boolean;
    }[];
  }[];
  label?: string;
  linkComponent?: React.ElementType;
}) {
  // Lazy initializer avoids the one-frame flash of all groups collapsed on mount
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.items?.length) {
        initial[item.url] = !!item.isActive;
      }
    });
    return initial;
  });

  const groupedItems = useMemo(
    () => items.filter((item) => item.items?.length),
    [items],
  );

  // When items change (navigation): initialize new entries and force-open groups
  // whose active child is now reachable — ensures the active item is never hidden
  // inside a user-collapsed group after navigation.
  useEffect(() => {
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = { ...prev };
      let changed = false;
      items.forEach((item) => {
        if (!item.items?.length)
          return;
        if (!(item.url in next)) {
          // First time seeing this URL (e.g. after a studio switch) — init from isActive
          next[item.url] = !!item.isActive;
          changed = true;
        } else if (item.isActive && !next[item.url]) {
          // Group became active (user navigated to a child) — force open
          next[item.url] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  const hasExpandableGroups = groupedItems.length > 0;
  const hasAnyExpanded = groupedItems.some((item) => openGroups[item.url]);

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

  const renderSubItemContent = (subItem: { title: string; url: string; icon?: LucideIcon }) => {
    const SubIcon = subItem.icon;

    if (LinkComponent) {
      return (
        <LinkComponent href={subItem.url}>
          {SubIcon && <SubIcon className="size-3.5 opacity-75" />}
          <span>{subItem.title}</span>
        </LinkComponent>
      );
    }

    return (
      <a href={subItem.url}>
        {SubIcon && <SubIcon className="size-3.5 opacity-75" />}
        <span>{subItem.title}</span>
      </a>
    );
  };

  return (
    <SidebarGroup>
      {(label || hasExpandableGroups) && (
        <div className="flex items-center justify-between px-2">
          {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
          {hasExpandableGroups && (
            <SidebarGroupAction
              title={hasAnyExpanded ? 'Collapse groups' : 'Expand groups'}
              onClick={() => {
                setOpenGroups(
                  Object.fromEntries(
                    groupedItems.map((item) => [item.url, !hasAnyExpanded]),
                  ),
                );
              }}
            >
              <ChevronsUpDown />
              <span className="sr-only">{hasAnyExpanded ? 'Collapse groups' : 'Expand groups'}</span>
            </SidebarGroupAction>
          )}
        </div>
      )}
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.url}
            asChild
            open={item.items?.length ? !!openGroups[item.url] : undefined}
            onOpenChange={(open) => {
              if (!item.items?.length) {
                return;
              }
              setOpenGroups((prev) => ({ ...prev, [item.url]: open }));
            }}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              {item.items?.length
                ? (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={item.isActive}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  )
                : (
                    <SidebarMenuButton asChild tooltip={item.title} isActive={item.isActive}>
                      {renderMenuButtonContent(item)}
                    </SidebarMenuButton>
                  )}

              {!!item.items?.length && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.url}>
                        <SidebarMenuSubButton asChild isActive={subItem.isActive}>
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
