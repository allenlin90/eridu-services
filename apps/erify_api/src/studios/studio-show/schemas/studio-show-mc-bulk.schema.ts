import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { McService } from '@/models/mc/mc.service';
import { ShowService } from '@/models/show/show.service';

export const bulkMcAssignmentInputSchema = z.object({
  show_ids: z
    .array(z.string().startsWith(ShowService.UID_PREFIX))
    .min(1, 'At least one show_id is required'),
  mc_ids: z
    .array(z.string().startsWith(McService.UID_PREFIX))
    .min(1, 'At least one mc_id is required'),
});

export const bulkMcAssignmentErrorSchema = z.object({
  show_id: z.string(),
  mc_id: z.string(),
  reason: z.string(),
});

export const bulkMcAssignmentResponseSchema = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
  removed: z.number().int(),
  errors: z.array(bulkMcAssignmentErrorSchema),
});

export class BulkMcAssignmentDto extends createZodDto(bulkMcAssignmentInputSchema) {}

export type BulkMcAssignmentInput = z.infer<typeof bulkMcAssignmentInputSchema>;
export type BulkMcAssignmentError = z.infer<typeof bulkMcAssignmentErrorSchema>;
export type BulkMcAssignmentResponse = z.infer<typeof bulkMcAssignmentResponseSchema>;
