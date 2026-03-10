import { STUDIO_ROLE, type StudioRole } from '@eridu/api-types/memberships';

export const STUDIO_ROUTE_ACCESS = {
  dashboard: STUDIO_ROLE.MEMBER,
  myTasks: STUDIO_ROLE.MEMBER,
  myShifts: STUDIO_ROLE.MEMBER,
  tasks: STUDIO_ROLE.MANAGER,
  shifts: STUDIO_ROLE.ADMIN,
  members: STUDIO_ROLE.ADMIN,
  shows: STUDIO_ROLE.MANAGER,
  creators: STUDIO_ROLE.MANAGER,
  taskTemplates: STUDIO_ROLE.ADMIN,
} as const satisfies Record<string, StudioRole>;

export type StudioRouteAccessKey = keyof typeof STUDIO_ROUTE_ACCESS;

const STUDIO_ROUTE_ROLE_ALLOWLIST: Partial<Record<StudioRouteAccessKey, StudioRole[]>> = {
  // Show operations are manager/admin workflows.
  shows: [STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER],
  // Member roster is admin-only workflow.
  members: [STUDIO_ROLE.ADMIN],
  // Creator mapping is manager/admin/talent-manager.
  creators: [STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER],
};

const STUDIO_ROLE_LEVEL: Record<StudioRole, number> = {
  [STUDIO_ROLE.MEMBER]: 1,
  [STUDIO_ROLE.TALENT_MANAGER]: 1,
  [STUDIO_ROLE.DESIGNER]: 1,
  [STUDIO_ROLE.MODERATION_MANAGER]: 1,
  [STUDIO_ROLE.MANAGER]: 2,
  [STUDIO_ROLE.ADMIN]: 3,
};

export function hasStudioRouteAccess(
  role: StudioRole | null | undefined,
  routeKey: StudioRouteAccessKey,
): boolean {
  if (!role) {
    return false;
  }

  const allowlist = STUDIO_ROUTE_ROLE_ALLOWLIST[routeKey];
  if (allowlist) {
    return allowlist.includes(role);
  }

  const requiredRole = STUDIO_ROUTE_ACCESS[routeKey];
  const roleLevel = STUDIO_ROLE_LEVEL[role];
  const requiredRoleLevel = STUDIO_ROLE_LEVEL[requiredRole];
  return roleLevel !== undefined && requiredRoleLevel !== undefined && roleLevel >= requiredRoleLevel;
}
