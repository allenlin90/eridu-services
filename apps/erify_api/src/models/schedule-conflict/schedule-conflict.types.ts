export type HeldBackFieldValue = string | number | boolean | bigint | null | { uid: string; name: string };

export type ScheduleConflictHeldBack = {
  showFields: {
    changedFields: string[];
    old: Record<string, HeldBackFieldValue>;
    new: Record<string, HeldBackFieldValue>;
  } | null;
  showCreators: Array<{
    creatorUid: string;
    action: 'update' | 'remove';
    oldNote: string | null;
    newNote: string | null;
  }>;
  showPlatforms: Array<{
    platformUid: string;
    action: 'update' | 'remove';
    old: { liveStreamLink: string | null; platformShowId: string | null };
    new: { liveStreamLink: string | null; platformShowId: string | null };
  }>;
  proposedStatusTransition: { from: string; to: 'CANCELLED' | 'CANCELLED_PENDING_RESOLUTION' } | null;
};

export type ReconcileShowConflictParams = {
  showId: bigint;
  scheduleUid: string;
  externalId: string | null;
  actorId: bigint;
  conflictType: 'update_held_back' | 'removal_held_back';
  /** `null` means nothing was held back for this show on this publish run. */
  heldBack: ScheduleConflictHeldBack | null;
};

/** The FK-backed fields inside `show_fields` and the Prisma model each resolves against. */
export const FK_FIELD_MODEL_MAP = {
  client_id: 'client',
  studio_id: 'studio',
  studio_room_id: 'studioRoom',
  show_type_id: 'showType',
  show_status_id: 'showStatus',
  show_standard_id: 'showStandard',
} as const;

export type DismissConflictParams = {
  showId: bigint;
  conflictUid: string;
  actorId: bigint;
  reason: string;
};

export type ApplyConflictParams = DismissConflictParams & {
  /** Current live show status system key, for the terminal-status eligibility recheck. */
  currentShowStatus: string;
  /** Current DB values for every field in the snapshot's `show_fields.changed_fields`, keyed the same way. Empty object for a `removal_held_back` conflict with no field diff. */
  currentFieldValues: Record<string, unknown>;
};

export type CheckEligibilityParams = {
  showId: bigint;
  conflictUid: string;
  /** Current live show status system key, for the terminal-status eligibility check. */
  currentShowStatus: string;
};

export type CheckEligibilityResult = {
  eligible: boolean;
};

export type ResolveConflictResult = {
  outcome: 'applied' | 'dismissed';
};

const UPDATE_TERMINAL_STATUS_KEYS = new Set(['LIVE', 'COMPLETED']);
const REMOVAL_TERMINAL_STATUS_KEYS = new Set(['LIVE', 'COMPLETED', 'CANCELLED', 'CANCELLED_PENDING_RESOLUTION']);

export function isNoLongerEligible(conflictType: 'update_held_back' | 'removal_held_back', currentShowStatus: string): boolean {
  const terminalSet = conflictType === 'removal_held_back' ? REMOVAL_TERMINAL_STATUS_KEYS : UPDATE_TERMINAL_STATUS_KEYS;
  return terminalSet.has(currentShowStatus);
}
