// Define member group types and roles with their descriptions
export const GROUP_TYPE = {
  CLIENT: 'client',
  PLATFORM: 'platform',
  STUDIO: 'studio',
} as const;

export const ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;

export type GroupType = (typeof GROUP_TYPE)[keyof typeof GROUP_TYPE];
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const GROUP_TYPE_SET = new Set<GroupType>(Object.values(GROUP_TYPE));
export const ROLE_SET = new Set<Role>(Object.values(ROLE));

// Input validation error messages
export const VALIDATION_MESSAGES = {
  INVALID_GROUP_TYPE: (validTypes: string[]) =>
    `Invalid group type. Must be one of: ${validTypes.join(', ')}`,
  INVALID_ROLE: (validRoles: string[]) =>
    `Invalid role. Must be one of: ${validRoles.join(', ')}`,
} as const;
