import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ClientService } from '@/models/client/client.service';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { StudioService } from '@/models/studio/studio.service';

// ShowPlanItem schema for plan document
export const showPlanItemMcSchema = z.object({
  mcUid: z.string(),
  note: z.string().optional(),
});

export const showPlanItemPlatformSchema = z.object({
  platformUid: z.string(),
  liveStreamLink: z.string().optional(),
  platformShowId: z.string().optional(),
});

export const showPlanItemSchema = z
  .object({
    tempId: z.string().optional(),
    existingShowUid: z.string().optional(),
    name: z.string().min(1).max(255),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    clientUid: z.string().startsWith(ClientService.UID_PREFIX),
    studioRoomUid: z.string().startsWith(StudioService.UID_PREFIX).optional(),
    showTypeUid: z.string().startsWith(ShowTypeService.UID_PREFIX),
    showStatusUid: z.string().startsWith(ShowStatusService.UID_PREFIX),
    showStandardUid: z.string().startsWith(ShowStandardService.UID_PREFIX),
    mcs: z.array(showPlanItemMcSchema).optional().default([]),
    platforms: z.array(showPlanItemPlatformSchema).optional().default([]),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const planDocumentSchema = z.object({
  metadata: z.object({
    lastEditedBy: z.string(),
    lastEditedAt: z.iso.datetime(),
    totalShows: z.number().int().nonnegative(),
    clientName: z.string(),
    dateRange: z.object({
      start: z.iso.datetime(),
      end: z.iso.datetime(),
    }),
  }),
  shows: z.array(showPlanItemSchema),
});

// Validation schemas
export const validateScheduleSchema = z.object({
  schedule_uid: z.string(),
});

// Publish schema
export const publishScheduleSchema = z.object({
  version: z.number().int().positive(),
});

// Restore schema
export const restoreFromSnapshotSchema = z.object({
  snapshot_uid: z.string(),
});

// Validation result schema
export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(
    z.object({
      type: z.enum([
        'time_range',
        'room_conflict',
        'mc_double_booking',
        'reference_not_found',
        'internal_conflict',
      ]),
      message: z.string(),
      showIndex: z.number().optional(),
      showTempId: z.string().optional(),
    }),
  ),
});

// DTOs
export class ValidateScheduleDto extends createZodDto(validateScheduleSchema) {}
export class PublishScheduleDto extends createZodDto(publishScheduleSchema) {}
export class RestoreFromSnapshotDto extends createZodDto(
  restoreFromSnapshotSchema,
) {}

// Types
export type ShowPlanItem = z.infer<typeof showPlanItemSchema>;
export type PlanDocument = z.infer<typeof planDocumentSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ValidationError = ValidationResult['errors'][number];
