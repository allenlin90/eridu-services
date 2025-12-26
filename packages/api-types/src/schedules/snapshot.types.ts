import type { z } from 'zod';

import type {
  listSnapshotsQuerySchema,
  scheduleSnapshotApiResponseSchema,
} from './snapshot.schemas.js';

export type ScheduleSnapshot = z.infer<typeof scheduleSnapshotApiResponseSchema>;
export type ListSnapshotsQuery = z.infer<typeof listSnapshotsQuerySchema>;
