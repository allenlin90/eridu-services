import { z } from 'zod';

import { createPaginatedResponseSchema } from '../pagination/schemas.js';

/**
 * Snapshot Reason Enum
 */
export const SNAPSHOT_REASON = {
  AUTO_SAVE: 'auto_save',
  BEFORE_PUBLISH: 'before_publish',
  MANUAL: 'manual',
  BEFORE_RESTORE: 'before_restore',
} as const;

/**
 * Schedule Snapshot API Response Schema (snake_case)
 */
export const scheduleSnapshotApiResponseSchema = z.object({
  id: z.string(), // UID
  plan_document: z.record(z.string(), z.any()),
  version: z.number().int(),
  status: z.string(),
  snapshot_reason: z.string(),
  metadata: z.record(z.string(), z.any()),
  created_by: z.string().nullable(), // User UID
  created_by_name: z.string().nullable(),
  schedule_id: z.string().nullable(), // Schedule UID
  schedule_name: z.string().nullable(),
  created_at: z.iso.datetime(),
});

/**
 * List Snapshots Response Schema
 */
export const scheduleSnapshotListResponseSchema
  = createPaginatedResponseSchema(scheduleSnapshotApiResponseSchema);

/**
 * List Snapshots Query Parameters Schema
 */
export const listSnapshotsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).optional().default(10),
});
