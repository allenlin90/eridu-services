import type { AppSidebar } from "@eridu/ui/components/app-sidebar";

import { isMembershipAuthorized } from "@/auth/services/membership.service";
import { Organization, Team } from "@/auth/types";
import { ROUTES } from "@/constants/routes";
import { useActiveMembership } from "@/hooks/use-active-membership";
import { useSession } from "@eridu/auth-service/hooks/use-session";
import { NotepadText, ShieldUser, TvMinimalPlay, UserCog, Video } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router";

type NavMain = React.ComponentProps<typeof AppSidebar>["navMain"][0];

export const useNavMain = (): NavMain[] => {
  const { session } = useSession();
  const { activeMembership } = useActiveMembership();
  const navigate = useNavigate();

  return useMemo(() => {
    const navList: NavMain[] = [];
    const organizationUid = session?.activeOrganizationId || session?.memberships[0]?.organization.id;

    const eriduAdminList: NavMain = {
      title: "Eridu Admin",
      icon: UserCog,
      isActive: true,
      items: [
        {
          title: "Users",
          onClick: () => navigate(ROUTES.ADMIN.USERS),
          props: { className: "w-full" },
        },
      ],
    };

    if (organizationUid) {
      const membership = session.memberships.find(m => m.organization.id === organizationUid);

      membership && eriduAdminList.items?.push({
        title: membership.organization.name,
        onClick: () => navigate(ROUTES.ADMIN.ORGANIZATION_DETAILS(organizationUid)),
        props: { className: "w-full" },
      });
    }

    if (session?.role === "admin") {
      navList.push(eriduAdminList);
    }

    const showList: NavMain = {
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

    const erifyOnsetList: NavMain = {
      title: "Erify Onset",
      icon: Video,
      isActive: false,
      items: [
        {
          title: "Inventory",
          onClick: () => navigate(ROUTES.ERIFY.ONSET.INVENTORY),
          props: { className: "w-full", disabled: true },
        },
        {
          title: "Pre-production",
          onClick: () => navigate(ROUTES.ERIFY.ONSET.PRE_PRODUCTION),
          props: { className: "w-full", disabled: true },
        },
        {
          title: "Post-production",
          onClick: () => navigate(ROUTES.ERIFY.ONSET.POST_PRODUCTION),
          props: { className: "w-full", disabled: true },
        },
      ],
    };

    if (isMembershipAuthorized(activeMembership, {
      organizations: [Organization.Erify],
      teams: [Team.Onset],
    })) {
      navList.push(erifyOnsetList);
    }

    const erifyOffsetList: NavMain = {
      title: "Erify Offset",
      icon: NotepadText,
      isActive: false,
      items: [
        {
          title: "MC Admin",
          onClick: () => navigate(ROUTES.ERIFY.OFFSET.MC_ADMIN),
          props: { className: "w-full", disabled: true },
        },
        {
          title: "Scene",
          onClick: () => navigate(ROUTES.ERIFY.OFFSET.SCENE),
          props: { className: "w-full", disabled: true },
        },
        {
          title: "Script",
          onClick: () => navigate(ROUTES.ERIFY.OFFSET.SCRIPT),
          props: { className: "w-full", disabled: true },
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

    const adminList: NavMain = {
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
          title: "Clients",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.CLIENTS),
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
          title: "Studio Rooms",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.STUDIO_ROOMS),
          props: { className: "w-full" },
        },
        {
          title: "Studios",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.STUDIOS),
          props: { className: "w-full" },
        },
        {
          title: "Mcs",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.MCS),
          props: { className: "w-full" },
        },
        {
          title: "Operators",
          onClick: () => navigate(ROUTES.ERIFY.ADMIN.OPERATORS),
          props: { className: "w-full", disabled: true },
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
  }, [activeMembership, navigate, session]);
};
