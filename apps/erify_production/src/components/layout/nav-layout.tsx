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

type Team = React.ComponentProps<typeof AppSidebar>["teams"][0];
type Projects = React.ComponentProps<typeof AppSidebar>["projects"];
type NavMains = React.ComponentProps<typeof AppSidebar>["navMain"];

export const NavLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { session, signout } = useSession();
  const navigate = useNavigate();

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

  // TODO: render correct nav items
  const navMain: NavMains = [];
  const projects: Projects = [];

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

  const teams = useMemo<Team[]>(() => {
    // @ts-expect-error // TODO: fix ts type error
    return session?.memberships.map<Teams>(membership => ({
      id: membership.id,
      name: membership.organization?.name,
      logo: renderLogo(membership.organization?.logo),
      plan: membership.role,
      onSwitchTeam: (_team => (_e) => {
        // TODO: manage switch team state
      }) as Team["onSwitchTeam"],
    }));
  }, [renderLogo, session?.memberships]);

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
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};
