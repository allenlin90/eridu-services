import type { StudioCreatorCompensationShow } from '@eridu/api-types/studio-creators';

export const UNRESOLVED_REASON_LABELS: Record<string, string> = {
  AGREEMENT_SNAPSHOT_MISSING: 'Agreement pending',
  COMMISSION_REVENUE_NOT_AVAILABLE: 'Revenue pending verification',
};

export function formatAmount(value: string | null) {
  return value ? `$${value}` : '—';
}

export function formatUnresolvedReason(value: string | null) {
  if (!value) {
    return null;
  }
  return UNRESOLVED_REASON_LABELS[value] ?? value;
}

export function formatAgreedRate(show: StudioCreatorCompensationShow) {
  if (show.compensation_type === 'COMMISSION' && !show.agreed_rate) {
    return '—';
  }
  return formatAmount(show.agreed_rate);
}

export function formatCommissionRate(show: StudioCreatorCompensationShow) {
  return show.commission_rate ? `${show.commission_rate}%` : '—';
}

export function formatAdjustmentTotal(adjustmentTotal: string) {
  const value = Number.parseFloat(adjustmentTotal);
  if (value === 0) {
    return '$0.00';
  }
  if (value < 0) {
    return `-$${Math.abs(value).toFixed(2)}`;
  }
  return `+$${adjustmentTotal}`;
}

export function getAdjustmentTone(adjustmentTotal: string) {
  const value = Number.parseFloat(adjustmentTotal);
  if (value === 0) {
    return 'muted' as const;
  }
  if (value < 0) {
    return 'negative' as const;
  }
  return 'positive' as const;
}

export function getCompensationTypeBadgeClass(compensationType: string) {
  if (compensationType === 'FIXED') {
    return 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20 text-[10px]';
  }
  if (compensationType === 'COMMISSION') {
    return 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px]';
  }
  return 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/20 text-[10px]';
}
