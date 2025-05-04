import { useNavMain } from "@/hooks/use-nav-main";
import { useProjects } from "@/hooks/use-projects";
import { useSidebarTeams } from "@/hooks/use-sidebar-teams";
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

export const NavLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { session, signout } = useSession();
  const navigate = useNavigate();
  const teams = useSidebarTeams();
  const navMain = useNavMain();
  const projects = useProjects();

  const onSignout = useCallback(async () => {
    await signout();
    navigate("/login");
  }, [navigate, signout]);

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
