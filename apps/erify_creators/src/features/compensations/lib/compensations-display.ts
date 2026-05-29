import Big from 'big.js';

import type { StudioCreatorCompensationShow } from '@eridu/api-types/studio-creators';

import { toDecimalDisplayString } from '@/lib/decimal-format';

const EM_DASH = '—';

export const UNRESOLVED_REASON_LABELS: Record<string, string> = {
  AGREEMENT_SNAPSHOT_MISSING: 'Agreement pending',
  COMMISSION_REVENUE_NOT_AVAILABLE: 'Revenue pending verification',
};

export function formatAmount(value: string | null) {
  return value ? `$${toDecimalDisplayString(value)}` : EM_DASH;
}

export function formatUnresolvedReason(value: string | null) {
  if (!value) {
    return null;
  }
  return UNRESOLVED_REASON_LABELS[value] ?? value;
}

export function formatAgreedRate(show: StudioCreatorCompensationShow) {
  if (show.compensation_type === 'COMMISSION' && !show.agreed_rate) {
    return EM_DASH;
  }
  return formatAmount(show.agreed_rate);
}

export function formatCommissionRate(show: StudioCreatorCompensationShow) {
  return show.commission_rate ? `${show.commission_rate}%` : EM_DASH;
}

export function formatAdjustmentTotal(adjustmentTotal: string) {
  const value = new Big(adjustmentTotal);
  const magnitude = value.abs().toFixed(2);
  if (value.eq(0)) {
    return '$0.00';
  }
  if (value.lt(0)) {
    return `-$${magnitude}`;
  }
  return `+$${magnitude}`;
}

export function getAdjustmentTone(adjustmentTotal: string) {
  const value = new Big(adjustmentTotal);
  if (value.eq(0)) {
    return 'muted' as const;
  }
  if (value.lt(0)) {
    return 'negative' as const;
  }
  return 'positive' as const;
}

export function compensationTypeBadgeVariant(
  compensationType: string,
): 'default' | 'secondary' | 'outline' {
  if (compensationType === 'FIXED') {
    return 'secondary';
  }
  if (compensationType === 'COMMISSION') {
    return 'default';
  }
  return 'outline';
}
