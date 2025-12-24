'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@eridu/ui/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@eridu/ui/components/ui/sidebar';

export type Team = {
  name: string;
  logo: React.ElementType;
  plan: string;
};

export function TeamSwitcher({
  teams,
  activeTeam,
  onTeamChange,
}: {
  teams: Team[];
  activeTeam?: Team;
  onTeamChange?: (team: Team) => void;
}) {
  const { isMobile } = useSidebar();
  const [selectedTeam, setSelectedTeam] = React.useState<Team | undefined>(activeTeam || teams[0]);

  // Sync internal state if activeTeam prop changes
  React.useEffect(() => {
    if (activeTeam) {
      setSelectedTeam(activeTeam);
    }
  }, [activeTeam]);

  const handleTeamChange = (team: Team) => {
    setSelectedTeam(team);
    onTeamChange?.(team);
  };

  if (!selectedTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <selectedTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {selectedTeam.name}
                </span>
                <span className="truncate text-xs">{selectedTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => handleTeamChange(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <team.logo className="size-4 shrink-0" />
                </div>
                {team.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
