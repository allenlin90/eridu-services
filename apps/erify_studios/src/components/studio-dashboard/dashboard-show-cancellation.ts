const CANCELLATION_HISTORY_SHOW_STATUS_SYSTEM_KEYS = new Set(['CANCELLED', 'CANCELLED_PENDING_RESOLUTION', 'COMPLETED']);

export function mayHaveCancellationHistory(statusSystemKey: string | null | undefined): boolean {
  return CANCELLATION_HISTORY_SHOW_STATUS_SYSTEM_KEYS.has(statusSystemKey ?? '');
}
