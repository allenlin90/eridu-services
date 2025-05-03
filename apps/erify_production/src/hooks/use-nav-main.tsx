import type { AppSidebar } from "@eridu/ui/components/app-sidebar";

import { useSessionMemberships } from "@/auth/hooks/use-session-memberships";
import { ROUTES } from "@/constants/routes";
import { ShieldUser, TvMinimalPlay } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router";

type NavMains = React.ComponentProps<typeof AppSidebar>["navMain"];

export const useNavMain = (): NavMains => {
  const session = useSessionMemberships();
  const navigate = useNavigate();

  return useMemo(() => {
    const navList: NavMains = [];

    const showList: NavMains[0] = {
      title: "Livestream",
      icon: TvMinimalPlay,
      isActive: true,
      items: [
        {
          title: "Shows",
          onClick: () => navigate(ROUTES.LIVESTREAM.SHOWS),
          props: { className: "w-full" },
        },
      ],
    };

    if (session.isErifyTeam) {
      navList.push(showList);
    }

    const adminList: NavMains[0] = {
      title: "Erify Admin",
      icon: ShieldUser,
      isActive: true,
      items: [
        {
          title: "Brands",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.BRANDS),
          props: { className: "w-full" },
        },
        {
          title: "Materials",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.MATERIALS),
          props: { className: "w-full" },
        },
        {
          title: "Platforms",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.PLATFORMS),
          props: { className: "w-full" },
        },
        {
          title: "Shows",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.SHOWS),
          props: { className: "w-full" },
        },
        {
          title: "Studios",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.STUDIOS),
          props: { className: "w-full" },
        },
        {
          title: "Teams",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.TEAMS),
          props: { className: "w-full" },
        },
        {
          title: "Users",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.USERS),
          props: { className: "w-full" },
        },
      ],
    };

    if (session.isErifyAdmin) {
      navList.push(adminList);
    }

    return navList;
  }, [navigate, session]);
};
