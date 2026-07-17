/**
 * `source` is an open, extensible set (string column, not a Prisma enum) —
 * Google Sheets is today's staging surface for planning, but the product
 * direction is native in-app planning, so new trigger types must be a
 * one-line addition here, not a migration.
 */
export const PUBLISH_RUN_SOURCE = {
  GOOGLE_SHEETS_SYNC: 'google_sheets_sync',
  STUDIO_NATIVE_SNAPSHOT: 'studio_native_snapshot',
} as const;

export type PublishRunSource = (typeof PUBLISH_RUN_SOURCE)[keyof typeof PUBLISH_RUN_SOURCE];

export type CreatePublishRunPayload = {
  scheduleId: bigint;
  studioId: bigint | null;
  triggeredById: bigint | null;
  source: PublishRunSource;
};

/**
 * Schema-owned service result shapes — `PublishRunService` public signatures
 * expose these, never Prisma model types, so callers stay decoupled from the
 * ORM (repository-boundary rule).
 */
export type PublishRunRecord = {
  id: bigint;
  uid: string;
  source: string;
  /** JSONB publish summary; concrete shape is owned by the publish pipeline. */
  summary: unknown;
  createdAt: Date;
};

export type PublishRunListItem = PublishRunRecord & {
  schedule: { uid: string } | null;
  triggeredBy: { uid: string; name: string | null } | null;
};
