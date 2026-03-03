import { extname } from 'node:path';

import { Injectable } from '@nestjs/common';

import { TemplateSchemaValidator } from '@eridu/api-types/task-management';
import {
  FILE_UPLOAD_USE_CASE,
  type FileUploadUseCase,
  type PresignUploadRequest,
  type PresignUploadResponse,
} from '@eridu/api-types/uploads';

import { HttpError } from '@/lib/errors/http-error.util';
import { StorageService } from '@/lib/storage/storage.service';
import { TaskService } from '@/models/task/task.service';

type UploadRule = {
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
};

type MaterialAssetTaskContext = {
  type: string;
  targets?: Array<{ show: unknown | null }>;
  metadata?: unknown;
};

const KB = 1024;
const MB = 1024 * 1024;
const DEFAULT_PRESIGN_EXPIRY_SECONDS = 300;

const USE_CASE_RULES: Record<FileUploadUseCase, UploadRule> = {
  [FILE_UPLOAD_USE_CASE.QC_SCREENSHOT]: {
    // Frontend compresses images to this target before upload
    maxFileSizeBytes: 200 * KB,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [FILE_UPLOAD_USE_CASE.SCENE_REFERENCE]: {
    maxFileSizeBytes: 10 * MB,
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
  constructor(
    private readonly storageService: StorageService,
    private readonly taskService: TaskService,
  ) {}

  async createPresignedUpload(request: PresignUploadRequest & { actorId: string }): Promise<PresignUploadResponse> {
    const {
      use_case,
      mime_type,
      file_size,
      file_name,
      task_id,
      field_key,
      actorId,
    } = request;
    const rule = USE_CASE_RULES[use_case];

    if (!rule.allowedMimeTypes.includes(mime_type)) {
      throw HttpError.badRequest(`mime_type '${mime_type}' is not allowed for use_case '${use_case}'`);
    }

    if (file_size > rule.maxFileSizeBytes) {
      throw HttpError.badRequest(
        `file_size exceeds maximum for '${use_case}' (${rule.maxFileSizeBytes} bytes)`,
      );
    }

    const taskContext = await this.validateTemplateFilePolicy({
      useCase: use_case,
      mimeType: mime_type,
      fileName: file_name,
      taskId: task_id,
      fieldKey: field_key,
    });

    const fileName = this.withValidatedExtension(file_name, mime_type);
    const storageUseCase = this.resolveStorageUseCaseForObjectKey(use_case, taskContext);
    const objectKey = this.storageService.generateObjectKey(storageUseCase, actorId, fileName);
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

  private async validateTemplateFilePolicy(input: {
    useCase: string;
    mimeType: string;
    fileName: string;
    taskId?: string;
    fieldKey?: string;
  }): Promise<MaterialAssetTaskContext | null> {
    if (input.useCase !== FILE_UPLOAD_USE_CASE.MATERIAL_ASSET) {
      return null;
    }

    if (!input.taskId || !input.fieldKey) {
      throw HttpError.badRequest(
        'task_id and field_key are required for use_case \'MATERIAL_ASSET\'',
      );
    }

    const task = await this.taskService.findByUidWithSnapshot(input.taskId);
    if (!task) {
      throw HttpError.notFound('Task not found');
    }

    const parsedSchema = task.snapshot?.schema
      ? TemplateSchemaValidator.safeParse(task.snapshot.schema)
      : null;
    if (!parsedSchema?.success) {
      throw HttpError.badRequest('Task snapshot schema is invalid or unavailable');
    }

    const item = parsedSchema.data.items.find((entry) => entry.key === input.fieldKey);
    if (!item) {
      throw HttpError.badRequest(`field_key '${input.fieldKey}' was not found in task snapshot schema`);
    }
    if (item.type !== 'file') {
      throw HttpError.badRequest(`field_key '${input.fieldKey}' is not a file field`);
    }

    if (!this.mimeMatchesAccept(input.mimeType, input.fileName, item.validation?.accept)) {
      throw HttpError.badRequest(
        `mime_type '${input.mimeType}' is not allowed by template accept rule '${item.validation?.accept}'`,
      );
    }

    return {
      type: task.type,
      targets: task.targets,
      metadata: task.metadata,
    };
  }

  private resolveStorageUseCaseForObjectKey(
    useCase: string,
    taskContext: MaterialAssetTaskContext | null,
  ): string {
    if (useCase !== FILE_UPLOAD_USE_CASE.MATERIAL_ASSET) {
      return useCase;
    }

    if (!taskContext) {
      return useCase;
    }

    const metadataDirectory = this.extractDirectoryFromMetadata(taskContext.metadata);
    if (metadataDirectory) {
      return metadataDirectory;
    }

    const isShowLinked = taskContext.targets?.some((target) => target.show !== null) ?? false;
    if (!isShowLinked) {
      return 'single-use';
    }

    const directoryByTaskType: Partial<Record<string, string>> = {
      SETUP: 'pre-production',
      CLOSURE: 'mc-review',
    };

    return directoryByTaskType[taskContext.type] ?? 'show-general';
  }

  private extractDirectoryFromMetadata(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const uploadRouting = (metadata as { upload_routing?: unknown }).upload_routing;
    if (!uploadRouting || typeof uploadRouting !== 'object') {
      return null;
    }

    const directory = (uploadRouting as { material_asset_directory?: unknown }).material_asset_directory;
    if (typeof directory !== 'string' || directory.trim().length === 0) {
      return null;
    }

    return directory;
  }

  private mimeMatchesAccept(mimeType: string, fileName: string, accept?: string): boolean {
    if (!accept || accept.trim().length === 0) {
      return true;
    }

    const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
    const normalizedExt = extname(fileName).toLowerCase();
    const patterns = accept
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (patterns.length === 0) {
      return true;
    }

    return patterns.some((pattern) => {
      if (pattern.endsWith('/*')) {
        return normalizedMime.startsWith(pattern.slice(0, -1));
      }
      if (pattern.startsWith('.')) {
        return normalizedExt === pattern;
      }
      return normalizedMime === pattern;
    });
  }
}
