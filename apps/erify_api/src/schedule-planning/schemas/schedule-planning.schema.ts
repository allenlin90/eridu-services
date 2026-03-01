import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  publishScheduleResponseSchema,
  schedulePublishSummarySchema,
} from '@eridu/api-types/schedules';

import { ClientService } from '@/models/client/client.service';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { StudioService } from '@/models/studio/studio.service';

// ShowPlanItem schema for plan document
export const showPlanItemMcSchema = z.object({
  mcId: z.string(),
  note: z.string().optional(),
});

export const showPlanItemPlatformSchema = z.object({
  platformId: z.string(),
  liveStreamLink: z.string().optional(),
  platformShowId: z.string().optional(),
});

export const showPlanItemSchema = z
  .object({
    tempId: z.string().optional(),
    existingShowId: z.string().optional(),
    external_id: z.string().trim().min(1).optional(),
    externalId: z.string().trim().min(1).optional(),
    name: z.string().min(1).max(255),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    clientId: z.string().startsWith(ClientService.UID_PREFIX),
    studioId: z.string().startsWith(StudioService.UID_PREFIX).optional(),
    studioRoomId: z.string().optional(),
    showTypeId: z.string().startsWith(ShowTypeService.UID_PREFIX),
    showStatusId: z.string().startsWith(ShowStatusService.UID_PREFIX),
    showStandardId: z.string().startsWith(ShowStandardService.UID_PREFIX),
    mcs: z.array(showPlanItemMcSchema).optional().default([]),
    platforms: z.array(showPlanItemPlatformSchema).optional().default([]),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.external_id && !data.externalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'external_id is required',
        path: ['external_id'],
      });
    }
  })
  .transform(({ external_id, externalId, ...rest }) => ({
    ...rest,
    externalId: externalId ?? external_id!,
  }))
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

export const publishScheduleSummarySchema = schedulePublishSummarySchema;
export const publishScheduleResponseEnvelopeSchema = publishScheduleResponseSchema;

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
        'missing_field',
        'invalid_relationship',
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
export class PublishScheduleResponseEnvelopeDto extends createZodDto(
  publishScheduleResponseEnvelopeSchema,
) {}
export class RestoreFromSnapshotDto extends createZodDto(
  restoreFromSnapshotSchema,
) {}

// Types
type InferredShowPlanItem = z.infer<typeof showPlanItemSchema>;
export type ShowPlanItem = Omit<
  InferredShowPlanItem,
  'tempId' | 'existingShowId' | 'studioId' | 'studioRoomId' | 'metadata'
> & {
  tempId?: string;
  existingShowId?: string;
  studioId?: string;
  studioRoomId?: string;
  metadata?: Record<string, any>;
};

export type PlanDocument = Omit<z.infer<typeof planDocumentSchema>, 'shows'> & {
  shows: ShowPlanItem[];
};
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ValidationError = ValidationResult['errors'][number];
export type PublishScheduleSummary = z.infer<typeof publishScheduleSummarySchema>;
export type PublishScheduleResponseEnvelope = z.infer<
  typeof publishScheduleResponseEnvelopeSchema
>;
