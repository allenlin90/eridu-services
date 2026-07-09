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
