import type { AppSidebar } from "@eridu/ui/components/app-sidebar";

import { isMembershipAuthorized } from "@/auth/services/membership.service";
import { Organization, Team } from "@/auth/types";
import { ROUTES } from "@/constants/routes";
import { useActiveMembership } from "@/hooks/use-active-membership";
import { NotepadText, ShieldUser, TvMinimalPlay } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router";

type NavMains = React.ComponentProps<typeof AppSidebar>["navMain"];

export const useNavMain = (): NavMains => {
  const { activeMembership } = useActiveMembership();
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

    if (isMembershipAuthorized(
      activeMembership,
      { organizations: [Organization.Erify] },
    )) {
      navList.push(showList);
    }

    const erifyOffsetList: NavMains[0] = {
      title: "Erify Offset",
      icon: NotepadText,
      isActive: true,
      items: [
        {
          title: "MC Admin",
          onClick: () => navigate(ROUTES.ERIFY.OFFSET.MC_ADMIN),
          props: { className: "w-full" },
        },
        {
          title: "Scene",
          onClick: () => navigate(ROUTES.ERIFY.OFFSET.SCENE),
          props: { className: "w-full" },
        },
        {
          title: "Script",
          onClick: () => navigate(ROUTES.ERIFY.OFFSET.SCRIPT),
          props: { className: "w-full" },
        },
      ],
    };

    if (isMembershipAuthorized(
      activeMembership,
      {
        organizations: [Organization.Erify],
        teams: [Team.Offset],
      },
    )) {
      navList.push(erifyOffsetList);
    }

    const adminList: NavMains[0] = {
      title: "Erify Admin",
      icon: ShieldUser,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.BASE),
          props: { className: "w-full" },
        },
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

    if (isMembershipAuthorized(
      activeMembership,
      {
        organizations: [Organization.Erify],
        roles: ["admin"],
      },
    )) {
      navList.push(adminList);
    }

    return navList;
  }, [activeMembership, navigate]);
};
