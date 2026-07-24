import { HttpError } from '@/lib/errors/http-error.util';

export const CANCELLATION_GATE_OWNED_SHOW_STATUS_SYSTEM_KEYS = [
  'CANCELLED',
  'CANCELLED_PENDING_RESOLUTION',
] as const;

export function assertGenericShowStatusChangeAllowed(
  currentSystemKey: string | null | undefined,
  targetSystemKey: string | null | undefined,
): void {
  if (currentSystemKey === 'CANCELLED_PENDING_RESOLUTION') {
    throw HttpError.badRequest('SHOW_STATUS_LOCKED_BY_PENDING_CANCELLATION');
  }
  if (currentSystemKey === 'CANCELLED') {
    throw HttpError.badRequest('SHOW_STATUS_LOCKED_BY_CANCELLATION_GATE');
  }
  if (targetSystemKey === 'CANCELLED_PENDING_RESOLUTION') {
    throw HttpError.badRequest(
      'SHOW_STATUS_PENDING_RESOLUTION_REQUIRES_GATE',
    );
  }
  if (targetSystemKey === 'CANCELLED') {
    throw HttpError.badRequest('SHOW_STATUS_CANCELLATION_REQUIRES_GATE');
  }
}
