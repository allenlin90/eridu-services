import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import type {
  CreateStudioCreatorRosterInput,
  UpdateStudioCreatorRosterInput,
} from '@eridu/api-types/studio-creators';

export const UNSET_COMPENSATION_TYPE = 'UNSET' as const;

export type StudioCreatorCompensationTypeOption =
  | typeof UNSET_COMPENSATION_TYPE
  | (typeof CREATOR_COMPENSATION_TYPE)[keyof typeof CREATOR_COMPENSATION_TYPE];

export const STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS = [
  { value: UNSET_COMPENSATION_TYPE, label: 'Not set' },
  { value: CREATOR_COMPENSATION_TYPE.FIXED, label: 'Fixed' },
  { value: CREATOR_COMPENSATION_TYPE.COMMISSION, label: 'Commission' },
  { value: CREATOR_COMPENSATION_TYPE.HYBRID, label: 'Hybrid' },
] as const;

function parseOptionalNonNegativeNumber(
  value: string,
  fieldLabel: string,
): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} must be a non-negative number`);
  }

  return parsed;
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
  const defaultRate = parseOptionalNonNegativeNumber(params.defaultRate, 'Default rate');
  const normalizedType = normalizeCompensationType(params.defaultRateType);

  if (normalizedType === CREATOR_COMPENSATION_TYPE.FIXED || normalizedType === null) {
    return {
      default_rate: defaultRate,
      default_rate_type: normalizedType,
      default_commission_rate: null,
    } as const;
  }

  const commissionRate = parseOptionalNonNegativeNumber(
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
