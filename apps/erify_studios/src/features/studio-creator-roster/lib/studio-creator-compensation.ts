import {
  CREATOR_COMPENSATION_TYPE,
  CREATOR_TYPE,
  type CreatorType,
} from '@eridu/api-types/creators';
import type {
  CreateStudioCreatorRosterInput,
  OnboardCreatorInput,
  UpdateStudioCreatorRosterInput,
} from '@eridu/api-types/studio-creators';

import { toMoneyString } from '@/features/compensation-line-items/utils/money-input';

export const UNSET_COMPENSATION_TYPE = 'UNSET' as const;

export type StudioCreatorCompensationTypeOption =
  | typeof UNSET_COMPENSATION_TYPE
  | (typeof CREATOR_COMPENSATION_TYPE)[keyof typeof CREATOR_COMPENSATION_TYPE];

export const STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS = [
  { value: UNSET_COMPENSATION_TYPE, label: 'Not set', disabled: false },
  { value: CREATOR_COMPENSATION_TYPE.FIXED, label: 'Fixed', disabled: false },
  { value: CREATOR_COMPENSATION_TYPE.COMMISSION, label: 'Commission', disabled: true },
  { value: CREATOR_COMPENSATION_TYPE.HYBRID, label: 'Hybrid', disabled: true },
] as const;

function normalizeOptionalNonNegativeDecimalString(
  value: string,
  fieldLabel: string,
): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const normalized = toMoneyString(trimmed);
    if (normalized.startsWith('-')) {
      throw new Error('negative amount');
    }
    return normalized;
  } catch {
    throw new Error(`${fieldLabel} must be a non-negative number`);
  }
}

function normalizeCompensationType(
  value: StudioCreatorCompensationTypeOption,
): (typeof CREATOR_COMPENSATION_TYPE)[keyof typeof CREATOR_COMPENSATION_TYPE] | null {
  return value === UNSET_COMPENSATION_TYPE ? null : value;
}

function hasExplicitCompensationInput(params: {
  defaultRate: string;
  defaultRateType: StudioCreatorCompensationTypeOption;
  defaultCommissionRate: string;
}) {
  return params.defaultRate.trim().length > 0
    || params.defaultRateType !== UNSET_COMPENSATION_TYPE
    || params.defaultCommissionRate.trim().length > 0;
}

function buildCompensationFields(params: {
  defaultRate: string;
  defaultRateType: StudioCreatorCompensationTypeOption;
  defaultCommissionRate: string;
}) {
  const defaultRate = normalizeOptionalNonNegativeDecimalString(params.defaultRate, 'Default rate');
  const normalizedType = normalizeCompensationType(params.defaultRateType);

  if (normalizedType === CREATOR_COMPENSATION_TYPE.FIXED || normalizedType === null) {
    return {
      default_rate: defaultRate,
      default_rate_type: normalizedType,
      default_commission_rate: null,
    } as const;
  }

  const commissionRate = normalizeOptionalNonNegativeDecimalString(
    params.defaultCommissionRate,
    'Default commission rate',
  );

  if (commissionRate === null) {
    throw new Error('Default commission rate is required for commission and hybrid creators');
  }

  return {
    default_rate: defaultRate,
    default_rate_type: normalizedType,
    default_commission_rate: commissionRate,
  } as const;
}

export function buildCreateStudioCreatorRosterPayload(params: {
  creatorId: string;
  defaultRate: string;
  defaultRateType: StudioCreatorCompensationTypeOption;
  defaultCommissionRate: string;
}): CreateStudioCreatorRosterInput {
  if (!hasExplicitCompensationInput(params)) {
    return {
      creator_id: params.creatorId,
    };
  }

  const compensation = buildCompensationFields(params);

  return {
    creator_id: params.creatorId,
    ...compensation,
  };
}

export function buildUpdateStudioCreatorRosterPayload(params: {
  version: number;
  defaultRate: string;
  defaultRateType: StudioCreatorCompensationTypeOption;
  defaultCommissionRate: string;
  isActive: boolean;
}): UpdateStudioCreatorRosterInput {
  const compensation = buildCompensationFields(params);

  return {
    version: params.version,
    ...compensation,
    is_active: params.isActive,
  };
}

export function buildOnboardStudioCreatorPayload(params: {
  name: string;
  aliasName: string;
  type?: CreatorType;
  userId?: string;
  creatorMetadata?: Record<string, unknown>;
  defaultRate: string;
  defaultRateType: StudioCreatorCompensationTypeOption;
  defaultCommissionRate: string;
  rosterMetadata?: Record<string, unknown>;
}): OnboardCreatorInput {
  const name = params.name.trim();
  const aliasName = params.aliasName.trim();

  if (!name) {
    throw new Error('Creator name is required');
  }
  if (!aliasName) {
    throw new Error('Creator alias is required');
  }

  const rosterBase = hasExplicitCompensationInput(params)
    ? buildCompensationFields(params)
    : {};

  return {
    creator: {
      name,
      alias_name: aliasName,
      type: params.type ?? CREATOR_TYPE.STANDARD,
      user_id: params.userId?.trim() || undefined,
      metadata: params.creatorMetadata,
    },
    roster: {
      ...rosterBase,
      metadata: params.rosterMetadata,
    },
  };
}
