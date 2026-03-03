import { extname } from 'node:path';

import { Injectable } from '@nestjs/common';

import { TemplateSchemaValidator } from '@eridu/api-types/task-management';
import {
  FILE_UPLOAD_USE_CASE,
  type FileUploadUseCase,
  getUploadMaxFileSizeBytes,
  isUploadMimeTypeAllowed,
  type PresignUploadRequest,
  type PresignUploadResponse,
  type UploadRoutingMetadata,
} from '@eridu/api-types/uploads';

import { HttpError } from '@/lib/errors/http-error.util';
import { StorageService } from '@/lib/storage/storage.service';
import { TaskService } from '@/models/task/task.service';

type MaterialAssetTaskContext = {
  fieldKey: string;
  uploadVersion: number;
  type: string;
  show: {
    uid: string;
    externalId: string | null;
    clientName: string | null;
    mcNames: string[];
  } | null;
  targets?: Array<{ show: unknown | null }>;
  metadata?: unknown;
};

const DEFAULT_PRESIGN_EXPIRY_SECONDS = 300;

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
    const useCase = use_case as FileUploadUseCase;

    if (!isUploadMimeTypeAllowed(useCase, mime_type)) {
      throw HttpError.badRequest(`mime_type '${mime_type}' is not allowed for use_case '${use_case}'`);
    }

    const maxFileSizeBytes = getUploadMaxFileSizeBytes(useCase);
    if (file_size > maxFileSizeBytes) {
      throw HttpError.badRequest(
        `file_size exceeds maximum for '${use_case}' (${maxFileSizeBytes} bytes)`,
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
    const objectKey = this.resolveObjectKey({
      useCase: use_case,
      storageUseCase,
      actorId,
      fileName,
      taskContext,
    });
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

  private resolveObjectKey(input: {
    useCase: string;
    storageUseCase: string;
    actorId: string;
    fileName: string;
    taskContext: MaterialAssetTaskContext | null;
  }): string {
    if (input.useCase !== FILE_UPLOAD_USE_CASE.MATERIAL_ASSET) {
      return this.storageService.generateObjectKey(input.storageUseCase, input.actorId, input.fileName);
    }

    return this.buildMaterialAssetObjectKey({
      storageUseCase: input.storageUseCase,
      fileName: input.fileName,
      fieldKey: input.taskContext?.fieldKey ?? 'file',
      uploadVersion: input.taskContext?.uploadVersion ?? 1,
      showContext: input.taskContext?.show ?? null,
    });
  }

  private buildMaterialAssetObjectKey(input: {
    storageUseCase: string;
    fileName: string;
    fieldKey: string;
    uploadVersion: number;
    showContext: MaterialAssetTaskContext['show'];
  }): string {
    const date = new Date().toISOString().slice(0, 10);
    const extension = extname(input.fileName).toLowerCase();
    const baseName = input.showContext
      ? this.buildShowScopedMaterialAssetBaseName(input.showContext, input.uploadVersion)
      : `${this.normalizePathToken(input.fieldKey, 'file')}-v${input.uploadVersion}`;
    const safeDirectory = this.normalizePathToken(input.storageUseCase, 'material-asset');

    return `${safeDirectory}/${date}/${baseName}${extension}`;
  }

  private buildShowScopedMaterialAssetBaseName(
    show: NonNullable<MaterialAssetTaskContext['show']>,
    uploadVersion: number,
  ): string {
    const showRef = this.normalizePathToken(show.uid, 'show');
    return `${showRef}-v${uploadVersion}`;
  }

  private normalizePathToken(value: string | null | undefined, fallback: string): string {
    const normalized = (value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return normalized.length > 0 ? normalized : fallback;
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

    const uploadVersion = await this.taskService.reserveMaterialAssetUploadVersion(
      task.uid,
      input.fieldKey,
    );

    return {
      fieldKey: input.fieldKey,
      uploadVersion,
      type: task.type,
      show: this.extractMaterialAssetShowContext(task.targets),
      targets: task.targets,
      metadata: task.metadata,
    };
  }

  private extractMaterialAssetShowContext(targets: Array<{ show: unknown | null }> | undefined): MaterialAssetTaskContext['show'] {
    const linkedShow = targets?.find((target) => target.show !== null)?.show;
    if (!linkedShow || typeof linkedShow !== 'object') {
      return null;
    }

    const rawShow = linkedShow as {
      uid?: unknown;
      externalId?: unknown;
      client?: { name?: unknown } | null;
      showMCs?: Array<{ mc?: { name?: unknown; aliasName?: unknown } | null }> | null;
    };

    const uid = typeof rawShow.uid === 'string' ? rawShow.uid : null;
    if (!uid) {
      return null;
    }

    const mcNames = Array.isArray(rawShow.showMCs)
      ? rawShow.showMCs
          .map((showMc) => {
            const alias = showMc?.mc && typeof showMc.mc.aliasName === 'string'
              ? showMc.mc.aliasName
              : null;
            const name = showMc?.mc && typeof showMc.mc.name === 'string'
              ? showMc.mc.name
              : null;
            return alias ?? name;
          })
          .filter((name): name is string => !!name)
      : [];

    return {
      uid,
      externalId: typeof rawShow.externalId === 'string' ? rawShow.externalId : null,
      clientName: rawShow.client && typeof rawShow.client.name === 'string'
        ? rawShow.client.name
        : null,
      mcNames,
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
      // TODO(upload-workflow): keep these mappings for storage organization only.
      // UI workflow-specific handling for these directories will be added later.
      SETUP: 'pre-production',
      CLOSURE: 'mc-review',
    };

    return directoryByTaskType[taskContext.type] ?? 'show-general';
  }

  private extractDirectoryFromMetadata(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const uploadRouting = (metadata as Partial<UploadRoutingMetadata>).upload_routing;
    if (!uploadRouting || typeof uploadRouting !== 'object') {
      return null;
    }

    const directory = uploadRouting.material_asset_directory;
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
