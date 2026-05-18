import type {
  StudioMemberResponse,
  UpdateStudioMemberRequest,
} from '@eridu/api-types/memberships';

import { toMoneyString } from '@/features/compensation-line-items/utils/money-input';

export function buildStudioMemberUpdatePayload(
  member: StudioMemberResponse,
  role: StudioMemberResponse['role'],
  baseHourlyRate: string,
): UpdateStudioMemberRequest {
  const trimmedBaseHourlyRate = baseHourlyRate.trim();
  if (trimmedBaseHourlyRate === '') {
    if (member.base_hourly_rate === null || member.base_hourly_rate === undefined) {
      return { role };
    }
    throw new Error('Hourly rate must be a non-negative number');
  }

  const normalized = toMoneyString(trimmedBaseHourlyRate);
  if (normalized.startsWith('-')) {
    throw new Error('Hourly rate must be a non-negative number');
  }

  return {
    role,
    base_hourly_rate: normalized,
  };
}
