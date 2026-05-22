import type { z } from 'zod';

import type {
  actualsSourceSchema,
  auditActionSchema,
  auditApiResponseSchema,
  auditIngestionSourceSchema,
  auditMetadataSchema,
  auditTargetApiResponseSchema,
  auditTargetTypeSchema,
  auditTimelineEntrySchema,
} from './schemas.js';

export type AuditAction = z.infer<typeof auditActionSchema>;
export type AuditTargetType = z.infer<typeof auditTargetTypeSchema>;
export type ActualsSource = z.infer<typeof actualsSourceSchema>;
export type AuditIngestionSource = z.infer<typeof auditIngestionSourceSchema>;
export type AuditMetadata = z.infer<typeof auditMetadataSchema>;
export type AuditTargetApiResponse = z.infer<typeof auditTargetApiResponseSchema>;
export type AuditApiResponse = z.infer<typeof auditApiResponseSchema>;
export type AuditTimelineEntry = z.infer<typeof auditTimelineEntrySchema>;
