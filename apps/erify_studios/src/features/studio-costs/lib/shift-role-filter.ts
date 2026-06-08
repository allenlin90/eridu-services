import { STUDIO_ROLE } from '@eridu/api-types/memberships';

/**
 * The Shift Costs "Member Role" selector spans two distinct data-model concepts:
 * the operator's persisted studio-membership role (lowercase `STUDIO_ROLE`
 * values like `member`/`manager`) and the shift-level `isDutyManager` flag.
 * Keeping the selector options and their API-param translation in one place
 * stops them drifting — sending the UI label (`OPERATOR`/`MANAGER`) straight to
 * the membership-role filter silently matched nothing (fixed in PR 19.x).
 */
export const SHIFT_ROLE_FILTER_OPTIONS = [
  { value: 'operator', label: 'Operator' },
  { value: 'duty_manager', label: 'Duty Manager' },
  { value: 'manager', label: 'Manager' },
] as const;

export type ShiftRoleFilter = (typeof SHIFT_ROLE_FILTER_OPTIONS)[number]['value'];

/**
 * Translate the UI role discriminator into the matching costs-shifts API params
 * so the backend `where` filter actually matches:
 * - `operator` / `manager` → the persisted lowercase membership role
 * - `duty_manager` → the shift-level `is_duty_manager` flag (not a role)
 */
export function toShiftRoleQueryParams(
  role: string | undefined,
): { role?: string; is_duty_manager?: boolean } {
  switch (role) {
    case 'operator':
      return { role: STUDIO_ROLE.MEMBER };
    case 'manager':
      return { role: STUDIO_ROLE.MANAGER };
    case 'duty_manager':
      return { is_duty_manager: true };
    default:
      return {};
  }
}
