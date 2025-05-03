import type { Membership } from "@eridu/auth-service/types";

import { useActiveMembership } from "@/hooks/use-active-membership";
import { useNavMain } from "@/hooks/use-nav-main";
import { useProjects } from "@/hooks/use-projects";
import { useSession } from "@eridu/auth-service/hooks/use-session";
import { AppSidebar } from "@eridu/ui/components/app-sidebar";
import { Separator } from "@eridu/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@eridu/ui/components/sidebar";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

import { BreadcrumbHeader } from "./breadcrumb-header";

type TeamMembership = React.ComponentProps<typeof AppSidebar>["teams"][0];

export const NavLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { session, signout } = useSession();
  const { setActiveMembership } = useActiveMembership();
  const navigate = useNavigate();
  const navMain = useNavMain();
  const projects = useProjects();

  const onSignout = useCallback(async () => {
    await signout();
    navigate("/login");
  }, [navigate, signout]);

  const renderLogo = useCallback((imgUrl?: string | null) => () => {
    if (!imgUrl)
      return null;

    return (
      <img
        src={imgUrl}
        alt="logo"
        className="h-8 w-8 object-cover"
      />
    );
  }, []);

  const user = useMemo(() => {
    if (!session) {
      return null;
    }

    return {
      name: session.name,
      email: session.email,
      avatar: session.image ?? "",
    };
  }, [session]);

  const teams = useMemo<TeamMembership[]>(() => {
    return (session?.memberships as Membership[]).map((membership, _i, memberships) => ({
      id: membership.id,
      name: membership.organization?.name,
      logo: renderLogo(membership.organization?.logo),
      plan: membership.role,
      onSwitchTeam: teamMembership => (_e) => {
        const membership = memberships.find(membership =>
          membership.id === teamMembership.id,
        );
        setActiveMembership(membership);
      },
    }));
  }, [renderLogo, session?.memberships, setActiveMembership]);

  return (
    <SidebarProvider>
      <AppSidebar
        navMain={navMain}
        projects={projects}
        teams={teams}
        user={user}
        signout={onSignout}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <BreadcrumbHeader />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};
