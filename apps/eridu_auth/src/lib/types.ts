import type { User } from 'better-auth';

export type ExtendedUser = User & { role: string };

/**
 * Check if a user has a specific role.
 * Handles multiple roles stored as comma-separated string.
 */
export function hasRole(user: ExtendedUser | undefined, role: string): boolean {
  if (!user?.role)
    return false;
  return user.role.split(',').map((r) => r.trim()).includes(role);
}
