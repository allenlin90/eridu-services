import { SetMetadata } from '@nestjs/common';

import type { STUDIO_ROLE } from '@eridu/api-types/memberships';

export type StudioRole = (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE];

export const STUDIO_ROLES_KEY = 'studio_roles';
export const StudioProtected = (roles?: StudioRole[]) => SetMetadata(STUDIO_ROLES_KEY, roles || []);
