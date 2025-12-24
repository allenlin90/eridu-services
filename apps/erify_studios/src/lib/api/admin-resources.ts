/**
 * Admin resources that have UI support in erify_studios
 * Based on ADMIN_NAV_ITEMS in sidebar-config.tsx
 */
export const ADMIN_RESOURCES = [
  'clients',
  'mcs',
  'studio-memberships',
  'platforms',
  'show-standards',
  'show-types',
  'studio-rooms',
  'studios',
  'users',
] as const;

/**
 * Type-safe admin resource identifier
 * Only these resources are supported in the admin UI
 */
export type AdminResource = (typeof ADMIN_RESOURCES)[number];

/**
 * Resource metadata for display and configuration
 */
export const ADMIN_RESOURCE_META: Record<
  AdminResource,
  {
    singular: string;
    plural: string;
    apiPath: string;
  }
> = {
  'clients': {
    singular: 'Client',
    plural: 'Clients',
    apiPath: 'clients',
  },
  'mcs': {
    singular: 'MC',
    plural: 'MCs',
    apiPath: 'mcs',
  },
  'studio-memberships': {
    singular: 'Studio Membership',
    plural: 'Studio Memberships',
    apiPath: 'studio-memberships',
  },
  'platforms': {
    singular: 'Platform',
    plural: 'Platforms',
    apiPath: 'platforms',
  },
  'show-standards': {
    singular: 'Show Standard',
    plural: 'Show Standards',
    apiPath: 'show-standards',
  },
  'show-types': {
    singular: 'Show Type',
    plural: 'Show Types',
    apiPath: 'show-types',
  },
  'studio-rooms': {
    singular: 'Studio Room',
    plural: 'Studio Rooms',
    apiPath: 'studio-rooms',
  },
  'studios': {
    singular: 'Studio',
    plural: 'Studios',
    apiPath: 'studios',
  },
  'users': {
    singular: 'User',
    plural: 'Users',
    apiPath: 'users',
  },
};

/**
 * Type guard to check if a string is a valid admin resource
 */
export function isAdminResource(value: string): value is AdminResource {
  return ADMIN_RESOURCES.includes(value as AdminResource);
}
