import type { AppSidebar } from "@eridu/ui/components/app-sidebar";

import { useSessionMemberships } from "@/auth/hooks/use-session-memberships";
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
          title: "List of shows",
          onClick: () => navigate("/shows"),
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
      isActive: false,
      items: [
        {
          title: "Brands",
          onClick: () => navigate("/erify/admin/brands"),
          props: { className: "w-full" },
        },
        {
          title: "Platforms",
          onClick: () => navigate("/erify/admin/platforms"),
          props: { className: "w-full" },
        },
        {
          title: "Teams",
          onClick: () => navigate("/erify/admin/teams"),
          props: { className: "w-full" },
        },
        {
          title: "Users",
          onClick: () => navigate("/erify/admin/users"),
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
