import { extname } from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  FILE_UPLOAD_USE_CASE,
  type FileUploadUseCase,
  type PresignUploadRequest,
  type PresignUploadResponse,
} from '@eridu/api-types/uploads';

import { HttpError } from '@/lib/errors/http-error.util';
import { StorageService } from '@/lib/storage/storage.service';

type UploadRule = {
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
};

const MB = 1024 * 1024;
const DEFAULT_PRESIGN_EXPIRY_SECONDS = 300;

const USE_CASE_RULES: Record<FileUploadUseCase, UploadRule> = {
  [FILE_UPLOAD_USE_CASE.QC_SCREENSHOT]: {
    maxFileSizeBytes: 10 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [FILE_UPLOAD_USE_CASE.SCENE_REFERENCE]: {
    maxFileSizeBytes: 25 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  [FILE_UPLOAD_USE_CASE.INSTRUCTION_ASSET]: {
    maxFileSizeBytes: 50 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'],
  },
  [FILE_UPLOAD_USE_CASE.MATERIAL_ASSET]: {
    maxFileSizeBytes: 50 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'],
  },
};

@Injectable()
export class UploadService {
  constructor(private readonly storageService: StorageService) {}

  async createPresignedUpload(request: PresignUploadRequest & { actorId: string }): Promise<PresignUploadResponse> {
    const { use_case, mime_type, file_size, file_name, actorId } = request;
    const rule = USE_CASE_RULES[use_case];

    if (!rule.allowedMimeTypes.includes(mime_type)) {
      throw HttpError.badRequest(`mime_type '${mime_type}' is not allowed for use_case '${use_case}'`);
    }

    if (file_size > rule.maxFileSizeBytes) {
      throw HttpError.badRequest(
        `file_size exceeds maximum for '${use_case}' (${rule.maxFileSizeBytes} bytes)`,
      );
    }

    const fileName = this.withValidatedExtension(file_name, mime_type);
    const objectKey = this.storageService.generateObjectKey(use_case, actorId, fileName);
    const presignedResult = await this.storageService.generatePresignedUploadUrl({
      objectKey,
      contentType: mime_type,
      expiresInSeconds: DEFAULT_PRESIGN_EXPIRY_SECONDS,
    });

    return {
      upload_url: presignedResult.uploadUrl,
      upload_method: presignedResult.uploadMethod,
      upload_headers: {
        content_type: presignedResult.uploadHeaders.contentType,
      },
      object_key: presignedResult.objectKey,
      file_url: presignedResult.fileUrl,
      expires_in_seconds: presignedResult.expiresInSeconds,
    };
  }

  private withValidatedExtension(fileName: string, mimeType: string): string {
    const existingExt = extname(fileName).toLowerCase();
    if (existingExt) {
      return fileName;
    }

    const fallbackExt = this.mimeTypeToExtension(mimeType);
    if (!fallbackExt) {
      return fileName;
    }

    return `${fileName}${fallbackExt}`;
  }

  private mimeTypeToExtension(mimeType: string): string | null {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'video/mp4': '.mp4',
    };

    return map[mimeType] ?? null;
  }
}
