import { STUDIO_ROLE } from '@eridu/api-types/memberships';

export const ROLE_LABELS: Record<string, string> = {
  [STUDIO_ROLE.ADMIN]: 'Admin',
  [STUDIO_ROLE.MANAGER]: 'Manager',
  [STUDIO_ROLE.TALENT_MANAGER]: 'Talent Manager',
  [STUDIO_ROLE.DESIGNER]: 'Designer',
  [STUDIO_ROLE.MODERATION_MANAGER]: 'Moderation Manager',
  [STUDIO_ROLE.MEMBER]: 'Member',
};

export const ROLE_OPTIONS = [
  { value: STUDIO_ROLE.ADMIN, label: 'Admin' },
  { value: STUDIO_ROLE.MANAGER, label: 'Manager' },
  { value: STUDIO_ROLE.TALENT_MANAGER, label: 'Talent Manager' },
  { value: STUDIO_ROLE.DESIGNER, label: 'Designer' },
  { value: STUDIO_ROLE.MODERATION_MANAGER, label: 'Moderation Manager' },
  { value: STUDIO_ROLE.MEMBER, label: 'Member' },
] as const;
