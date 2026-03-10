import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { CreatorService } from '@/models/creator/creator.service';
import { ShowService } from '@/models/show/show.service';

export const bulkCreatorAssignmentInputSchema = z.object({
  show_ids: z
    .array(z.string().startsWith(ShowService.UID_PREFIX))
    .min(1, 'At least one show_id is required'),
  creator_ids: z
    .array(z.string().refine(CreatorService.isValidCreatorUid, 'Invalid creator ID'))
    .min(1, 'At least one creator_id is required'),
});

export const bulkCreatorAssignmentErrorSchema = z.object({
  show_id: z.string(),
  creator_id: z.string(),
  reason: z.string(),
});

export const bulkCreatorAssignmentResponseSchema = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
  removed: z.number().int(),
  errors: z.array(bulkCreatorAssignmentErrorSchema),
});

export class BulkCreatorAssignmentDto extends createZodDto(bulkCreatorAssignmentInputSchema) {}

export type BulkCreatorAssignmentInput = z.infer<typeof bulkCreatorAssignmentInputSchema>;
export type BulkCreatorAssignmentError = z.infer<typeof bulkCreatorAssignmentErrorSchema>;
export type BulkCreatorAssignmentResponse = z.infer<typeof bulkCreatorAssignmentResponseSchema>;
