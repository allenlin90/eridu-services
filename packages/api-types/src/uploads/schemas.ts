import { z } from 'zod';

export const FILE_UPLOAD_USE_CASE = {
  QC_SCREENSHOT: 'QC_SCREENSHOT',
  SCENE_REFERENCE: 'SCENE_REFERENCE',
  INSTRUCTION_ASSET: 'INSTRUCTION_ASSET',
  MATERIAL_ASSET: 'MATERIAL_ASSET',
} as const;

export type FileUploadUseCase = (typeof FILE_UPLOAD_USE_CASE)[keyof typeof FILE_UPLOAD_USE_CASE];

export const presignUploadRequestSchema = z.object({
  use_case: z.enum(Object.values(FILE_UPLOAD_USE_CASE) as [string, ...string[]]),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
  file_size: z.number().int().positive().max(100 * 1024 * 1024),
  file_name: z.string().min(1).max(255),
});

export const presignUploadResponseSchema = z.object({
  upload_url: z.url(),
  upload_method: z.literal('PUT'),
  upload_headers: z.object({
    content_type: z.string(),
  }),
  object_key: z.string(),
  file_url: z.url(),
  expires_in_seconds: z.number().int().positive(),
});

export type PresignUploadRequest = z.infer<typeof presignUploadRequestSchema>;
export type PresignUploadResponse = z.infer<typeof presignUploadResponseSchema>;
