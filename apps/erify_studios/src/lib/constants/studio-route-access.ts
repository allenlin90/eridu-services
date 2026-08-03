import { STUDIO_ROLE, type StudioRole } from '@eridu/api-types/memberships';

export const STUDIO_ROUTE_ACCESS = {
  dashboard: [
    STUDIO_ROLE.MEMBER,
    STUDIO_ROLE.DESIGNER,
    STUDIO_ROLE.MODERATION_MANAGER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
    STUDIO_ROLE.ACCOUNT_MANAGER,
  ],
  myTasks: [
    STUDIO_ROLE.MEMBER,
    STUDIO_ROLE.DESIGNER,
    STUDIO_ROLE.MODERATION_MANAGER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  myShifts: [
    STUDIO_ROLE.MEMBER,
    STUDIO_ROLE.DESIGNER,
    STUDIO_ROLE.MODERATION_MANAGER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  myCompensations: [
    STUDIO_ROLE.MEMBER,
    STUDIO_ROLE.DESIGNER,
    STUDIO_ROLE.MODERATION_MANAGER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  reviewQueue: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  sceneReview: [
    STUDIO_ROLE.DESIGNER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  showRunReview: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  schedulePublishImpacts: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  showAudits: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  // Read access matches `showTasks`: any active member who can already view
  // this show's operational surfaces (not ACCOUNT_MANAGER, matching the
  // isAM tab gating in shows/$showId/route.tsx). Create/escalate/reopen and
  // full-field edit are further restricted to ADMIN/MANAGER inside the
  // Issues tab itself — this key only gates whether the tab is reachable at
  // all. See apps/erify_api/docs/SHOW_ISSUE_OWNERSHIP.md Authorization.
  showIssues: [
    STUDIO_ROLE.MEMBER,
    STUDIO_ROLE.DESIGNER,
    STUDIO_ROLE.MODERATION_MANAGER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  shifts: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  shows: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
    STUDIO_ROLE.ACCOUNT_MANAGER,
  ],
  // Distinct from `shows`: task setup is an operational mutation surface
  // (Generate Tasks, Assign Tasks, Record Actuals), not the read-only show
  // detail pages — ACCOUNT_MANAGER must not get it just because it shares
  // the shows section.
  taskSetup: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  performance: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  showTasks: [
    STUDIO_ROLE.MEMBER,
    STUDIO_ROLE.DESIGNER,
    STUDIO_ROLE.MODERATION_MANAGER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  costs: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  taskTemplates: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
    STUDIO_ROLE.ACCOUNT_MANAGER,
  ],
  clientMechanics: [
    STUDIO_ROLE.ADMIN,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ACCOUNT_MANAGER,
  ],
  taskReports: [
    STUDIO_ROLE.MODERATION_MANAGER,
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  sharedFields: [
    STUDIO_ROLE.ADMIN,
  ],
  creatorRoster: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
  ],
  creatorCompensations: [
    STUDIO_ROLE.ADMIN,
    STUDIO_ROLE.MANAGER,
  ],
  creatorMapping: [
    STUDIO_ROLE.MANAGER,
    STUDIO_ROLE.TALENT_MANAGER,
    STUDIO_ROLE.ADMIN,
    STUDIO_ROLE.ACCOUNT_MANAGER,
  ],
  members: [
    STUDIO_ROLE.ADMIN,
    STUDIO_ROLE.MANAGER,
  ],
} as const satisfies Record<string, readonly StudioRole[]>;

export type StudioRouteAccessKey = keyof typeof STUDIO_ROUTE_ACCESS;

export function hasStudioRouteAccess(
  role: StudioRole | null | undefined,
  routeKey: StudioRouteAccessKey,
): boolean {
  if (!role) {
    return false;
  }

  return (STUDIO_ROUTE_ACCESS[routeKey] as readonly StudioRole[]).includes(role);
}
