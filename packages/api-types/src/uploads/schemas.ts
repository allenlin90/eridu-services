import { z } from 'zod';

export const FILE_UPLOAD_USE_CASE = {
  QC_SCREENSHOT: 'QC_SCREENSHOT',
  SCENE_REFERENCE: 'SCENE_REFERENCE',
  INSTRUCTION_ASSET: 'INSTRUCTION_ASSET',
  MATERIAL_ASSET: 'MATERIAL_ASSET',
} as const;

export type FileUploadUseCase = (typeof FILE_UPLOAD_USE_CASE)[keyof typeof FILE_UPLOAD_USE_CASE];

const KB = 1024;
const MB = 1024 * 1024;

type UploadUseCaseRule = {
  max_file_size_bytes: number;
  allowed_mime_types: readonly string[];
};

export const FILE_UPLOAD_USE_CASE_RULES: Record<FileUploadUseCase, UploadUseCaseRule> = {
  [FILE_UPLOAD_USE_CASE.QC_SCREENSHOT]: {
    max_file_size_bytes: 200 * KB,
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [FILE_UPLOAD_USE_CASE.SCENE_REFERENCE]: {
    max_file_size_bytes: 10 * MB,
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  [FILE_UPLOAD_USE_CASE.INSTRUCTION_ASSET]: {
    max_file_size_bytes: 50 * MB,
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'],
  },
  [FILE_UPLOAD_USE_CASE.MATERIAL_ASSET]: {
    max_file_size_bytes: 50 * MB,
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'],
  },
} as const;

export function getUploadMaxFileSizeBytes(useCase: FileUploadUseCase): number {
  return FILE_UPLOAD_USE_CASE_RULES[useCase].max_file_size_bytes;
}

export function isUploadMimeTypeAllowed(useCase: FileUploadUseCase, mimeType: string): boolean {
  return FILE_UPLOAD_USE_CASE_RULES[useCase].allowed_mime_types.includes(mimeType);
}

export type UploadRoutingMetadata = {
  upload_routing: {
    source: string;
    scope: string;
    material_asset_directory: string;
  };
};

export function getImageCompressionTargetBytes(fieldMaxBytes?: number): number {
  const fieldMax = fieldMaxBytes ?? Number.POSITIVE_INFINITY;
  return Math.min(fieldMax, getUploadMaxFileSizeBytes(FILE_UPLOAD_USE_CASE.QC_SCREENSHOT));
}

export const presignUploadRequestSchema = z.object({
  use_case: z.enum(Object.values(FILE_UPLOAD_USE_CASE) as [string, ...string[]]),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
  file_size: z.number().int().positive().max(100 * 1024 * 1024),
  file_name: z.string().min(1).max(255),
  task_id: z.string().startsWith('task_').optional(),
  field_key: z.string().regex(/^[a-z][a-z0-9_]*$/).optional(),
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
