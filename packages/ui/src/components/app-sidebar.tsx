"use client";

import * as React from "react";

import { NavMain } from "@eridu/ui/components/nav-main";
import { NavProjects } from "@eridu/ui/components/nav-projects";
import { NavUser } from "@eridu/ui/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@eridu/ui/components/sidebar";
import { TeamSwitcher } from "@eridu/ui/components/team-switcher";

type AppSideBarProps = {
  navMain: React.ComponentProps<typeof NavMain>["items"];
  onAddTeam?: (event: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
  projects: React.ComponentProps<typeof NavProjects>["projects"];
  signout: () => void | Promise<void>;
  teams: React.ComponentProps<typeof TeamSwitcher>["teams"];
  user: React.ComponentProps<typeof NavUser>["user"] | null;
} & React.ComponentProps<typeof Sidebar>;

export function AppSidebar({ navMain, onAddTeam, projects, teams, user, signout, ...props }: AppSideBarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} onAddTeam={onAddTeam} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} signout={signout} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
