import { describe, expect, it } from 'vitest';

import { SHIFT_ROLE_FILTER_OPTIONS, toShiftRoleQueryParams } from '../shift-role-filter';

describe('toShiftRoleQueryParams', () => {
  it('maps operator to the persisted member membership role', () => {
    expect(toShiftRoleQueryParams('operator')).toEqual({ role: 'member' });
  });

  it('maps manager to the persisted manager membership role', () => {
    expect(toShiftRoleQueryParams('manager')).toEqual({ role: 'manager' });
  });

  it('maps duty_manager to the shift-level flag, not a membership role', () => {
    expect(toShiftRoleQueryParams('duty_manager')).toEqual({ is_duty_manager: true });
  });

  it('returns no params for an unset or unknown selection', () => {
    expect(toShiftRoleQueryParams(undefined)).toEqual({});
    expect(toShiftRoleQueryParams('')).toEqual({});
    expect(toShiftRoleQueryParams('OPERATOR')).toEqual({});
  });

  it('only emits lowercase persisted role values (never the UI label)', () => {
    for (const option of SHIFT_ROLE_FILTER_OPTIONS) {
      const params = toShiftRoleQueryParams(option.value);
      if (params.role !== undefined) {
        expect(params.role).toBe(params.role.toLowerCase());
      }
    }
  });
});
