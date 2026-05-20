import type { CreatorCompensationType } from '@eridu/api-types/creators';
import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import type { UpdateStudioShowCreatorInput } from '@eridu/api-types/studio-creators';

import { toMoneyString } from '@/features/compensation-line-items/utils/money-input';

export const NO_COMPENSATION_TYPE = 'NONE' as const;

export type ShowCreatorCompensationTypeOption =
  | typeof NO_COMPENSATION_TYPE
  | CreatorCompensationType;

export const SHOW_CREATOR_COMPENSATION_TYPE_OPTIONS = [
  { value: NO_COMPENSATION_TYPE, label: 'Not set' },
  { value: CREATOR_COMPENSATION_TYPE.FIXED, label: 'Fixed' },
  { value: CREATOR_COMPENSATION_TYPE.COMMISSION, label: 'Commission', disabled: true },
  { value: CREATOR_COMPENSATION_TYPE.HYBRID, label: 'Hybrid', disabled: true },
] as const;

export type ShowCreatorAssignmentTermsForm = {
  note: string;
  agreedRate: string;
  compensationType: ShowCreatorCompensationTypeOption;
  commissionRate: string;
  overrideReason: string;
};

function normalizeMoneyInput(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed ? toMoneyString(trimmed) : null;
}

export function isAgreedRateEnabled(type: ShowCreatorCompensationTypeOption): boolean {
  return type === CREATOR_COMPENSATION_TYPE.FIXED || type === CREATOR_COMPENSATION_TYPE.HYBRID;
}

export function isCommissionRateEnabled(type: ShowCreatorCompensationTypeOption): boolean {
  return type === CREATOR_COMPENSATION_TYPE.COMMISSION || type === CREATOR_COMPENSATION_TYPE.HYBRID;
}

/**
 * Build the PATCH payload for `/studios/:id/shows/:id/creators/:id` from form state,
 * enforcing the cross-field invariants the BE `updateStudioShowCreatorInputSchema`
 * superRefine validates (see `docs/domain/economics-cost-model.md` §Validation).
 *
 * Fields that don't belong to the chosen `compensationType` are forced to `null` so
 * stale values (e.g. a leftover commission rate after switching HYBRID→FIXED) cannot
 * leak into the payload and trip BE validation.
 */
export function buildShowCreatorAssignmentTermsPayload(
  form: ShowCreatorAssignmentTermsForm,
): UpdateStudioShowCreatorInput {
  const compensationType = form.compensationType === NO_COMPENSATION_TYPE ? null : form.compensationType;

  const agreedRate = isAgreedRateEnabled(form.compensationType)
    ? normalizeMoneyInput(form.agreedRate)
    : null;
  const commissionRate = isCommissionRateEnabled(form.compensationType)
    ? normalizeMoneyInput(form.commissionRate)
    : null;

  if (compensationType === CREATOR_COMPENSATION_TYPE.COMMISSION && commissionRate === null) {
    throw new Error('Commission rate is required for commission and hybrid creators');
  }
  if (compensationType === CREATOR_COMPENSATION_TYPE.HYBRID && commissionRate === null) {
    throw new Error('Commission rate is required for commission and hybrid creators');
  }

  const trimmedOverrideReason = form.overrideReason.trim();

  return {
    note: form.note.trim() || null,
    agreed_rate: agreedRate,
    compensation_type: compensationType,
    commission_rate: commissionRate,
    override_reason: trimmedOverrideReason || undefined,
  };
}
