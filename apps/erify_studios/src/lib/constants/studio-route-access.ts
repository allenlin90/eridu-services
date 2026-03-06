import { STUDIO_ROLE, type StudioRole } from '@eridu/api-types/memberships';

export const STUDIO_ROUTE_ACCESS = {
  dashboard: STUDIO_ROLE.MEMBER,
  myTasks: STUDIO_ROLE.MEMBER,
  myShifts: STUDIO_ROLE.MEMBER,
  tasks: STUDIO_ROLE.MANAGER,
  shifts: STUDIO_ROLE.ADMIN,
  shows: STUDIO_ROLE.ADMIN,
  taskTemplates: STUDIO_ROLE.ADMIN,
} as const satisfies Record<string, StudioRole>;

export type StudioRouteAccessKey = keyof typeof STUDIO_ROUTE_ACCESS;

const STUDIO_ROLE_LEVEL: Record<StudioRole, number> = {
  [STUDIO_ROLE.MEMBER]: 1,
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

  const requiredRole = STUDIO_ROUTE_ACCESS[routeKey];
  return STUDIO_ROLE_LEVEL[role] >= STUDIO_ROLE_LEVEL[requiredRole];
}
