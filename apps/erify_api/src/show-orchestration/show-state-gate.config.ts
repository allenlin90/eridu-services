import { HttpError } from '@/lib/errors/http-error.util';

/**
 * Sentinel outcome meaning "revert Show.status to the from_status captured
 * when the gate opened" instead of a fixed mapped status.
 */
export const RESTORE_PREVIOUS_OUTCOME = 'RESTORE_PREVIOUS' as const;

export type GateOutcome =
  | 'CANCELLED'
  | 'COMPLETED'
  | typeof RESTORE_PREVIOUS_OUTCOME;

export type GateHistoryEvent = 'opened' | 'claimed' | 'reassigned' | 'resolved';

export type GateHistoryEntry = {
  event: GateHistoryEvent;
  actor_id: string | null;
  at: string;
  note?: string;
};

export type GateConfigEntry = {
  pendingStatus: string;
  allowedOutcomes: readonly GateOutcome[];
  outcomesRequiringNoActiveTasks: readonly GateOutcome[];
  reasonOptions: readonly string[];
  requiresOwner: boolean;
};

export const GATE_CONFIG = {
  show_cancellation: {
    pendingStatus: 'CANCELLED_PENDING_RESOLUTION',
    allowedOutcomes: ['CANCELLED', 'COMPLETED'],
    outcomesRequiringNoActiveTasks: ['CANCELLED'],
    reasonOptions: [
      'CREATOR_UNAVAILABLE',
      'ROOM_UNAVAILABLE',
      'EQUIPMENT_FAILURE',
      'UTILITY_OUTAGE',
      'PLATFORM_ISSUE',
      'CLIENT_REQUEST',
      'OTHER',
    ],
    requiresOwner: true,
  },
  schedule_publish_removal: {
    pendingStatus: 'CANCELLED_PENDING_RESOLUTION',
    allowedOutcomes: ['CANCELLED', RESTORE_PREVIOUS_OUTCOME],
    outcomesRequiringNoActiveTasks: ['CANCELLED'],
    reasonOptions: ['REMOVED_FROM_REPUBLISHED_SCHEDULE'],
    requiresOwner: false,
  },
} as const satisfies Record<string, GateConfigEntry>;

export type GateKind = keyof typeof GATE_CONFIG;

export function getGateConfig(gateKind: GateKind): GateConfigEntry {
  const config = GATE_CONFIG[gateKind];
  if (!config) {
    throw HttpError.badRequest(`UNKNOWN_GATE_KIND:${gateKind}`);
  }
  return config;
}
