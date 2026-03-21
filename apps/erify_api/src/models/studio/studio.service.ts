import { Injectable } from '@nestjs/common';
import type { Studio } from '@prisma/client';

import { type SharedField, sharedFieldsListSchema } from '@eridu/api-types/task-management';

import type {
  CreateSharedFieldPayload,
  CreateStudioPayload,
  UpdateSharedFieldPayload,
  UpdateStudioPayload,
} from './schemas/studio.schema';
import { StudioRepository } from './studio.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

/**
 * Service for managing Studio entities.
 */
@Injectable()
export class StudioService extends BaseModelService {
  static readonly UID_PREFIX = 'std';
  protected readonly uidPrefix = StudioService.UID_PREFIX;

  constructor(
    private readonly studioRepository: StudioRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Creates a new studio.
   */
  async createStudio(
    payload: CreateStudioPayload,
  ): Promise<Studio> {
    const uid = this.generateUid();
    return this.studioRepository.create({ ...payload, uid });
  }

  /**
   * Retrieves a studio by UID.
   */
  async getStudioById(
    uid: string,
    ...args: Parameters<StudioRepository['findByUid']> extends [string, ...infer R] ? R : never
  ): Promise<Awaited<ReturnType<StudioRepository['findByUid']>>> {
    return this.findStudioOrThrow(uid, ...args);
  }

  /**
   * Retrieves a studio by internal ID.
   */
  async findStudioById(
    ...args: Parameters<StudioRepository['findOne']>
  ): Promise<Awaited<ReturnType<StudioRepository['findOne']>>> {
    return this.studioRepository.findOne(...args);
  }

  /**
   * @internal
   */
  async findByUid(
    ...args: Parameters<StudioRepository['findByUid']>
  ): Promise<Awaited<ReturnType<StudioRepository['findByUid']>>> {
    return this.studioRepository.findByUid(...args);
  }

  /**
   * Lists studios with pagination and filtering.
   */
  async listStudios(
    ...args: Parameters<StudioRepository['findPaginated']>
  ): Promise<Awaited<ReturnType<StudioRepository['findPaginated']>>> {
    return this.studioRepository.findPaginated(...args);
  }

  /**
   * Updates a studio.
   */
  async updateStudio(
    uid: string,
    payload: UpdateStudioPayload,
  ): Promise<Studio> {
    return this.studioRepository.update({ uid }, payload);
  }

  /**
   * Soft deletes a studio.
   */
  async deleteStudio(uid: string): Promise<Studio> {
    return this.studioRepository.softDelete({ uid });
  }

  async getSharedFields(studioUid: string): Promise<SharedField[]> {
    const studio = await this.findStudioOrThrow(studioUid);
    return this.readSharedFields(studio);
  }

  async createSharedField(
    studioUid: string,
    payload: CreateSharedFieldPayload,
  ): Promise<SharedField[]> {
    // Known issue (accepted for MVP): this is a read-modify-write on JSON metadata and can
    // lose concurrent admin updates. See BE design doc §12 (race condition note).
    const studio = await this.findStudioOrThrow(studioUid);
    const sharedFields = this.readSharedFields(studio);

    if (sharedFields.some((field) => field.key === payload.key)) {
      throw HttpError.conflict(`Shared field key "${payload.key}" already exists`);
    }

    const nextFieldsResult = sharedFieldsListSchema.safeParse([
      ...sharedFields,
      {
        key: payload.key,
        type: payload.type,
        category: payload.category,
        label: payload.label,
        description: payload.description,
        is_active: payload.is_active ?? true,
      },
    ]);
    if (!nextFieldsResult.success) {
      throw HttpError.internalServerError('Failed to construct shared fields list');
    }
    const nextFields = nextFieldsResult.data;

    await this.studioRepository.replaceMetadataByUid(
      studioUid,
      this.withSharedFields(studio.metadata, nextFields),
    );

    return nextFields;
  }

  async updateSharedField(
    studioUid: string,
    fieldKey: string,
    payload: UpdateSharedFieldPayload,
  ): Promise<SharedField[]> {
    // Known issue (accepted for MVP): this is a read-modify-write on JSON metadata and can
    // lose concurrent admin updates. See BE design doc §12 (race condition note).
    const studio = await this.findStudioOrThrow(studioUid);
    const sharedFields = this.readSharedFields(studio);
    const fieldIndex = sharedFields.findIndex((field) => field.key === fieldKey);

    if (fieldIndex < 0) {
      throw HttpError.notFound('Shared field', fieldKey);
    }

    const existingField = sharedFields[fieldIndex];
    const updatedField: SharedField = { ...existingField, ...payload };

    const nextFieldsResult = sharedFieldsListSchema.safeParse([
      ...sharedFields.slice(0, fieldIndex),
      updatedField,
      ...sharedFields.slice(fieldIndex + 1),
    ]);
    if (!nextFieldsResult.success) {
      throw HttpError.internalServerError('Failed to construct shared fields list');
    }
    const nextFields = nextFieldsResult.data;

    await this.studioRepository.replaceMetadataByUid(
      studioUid,
      this.withSharedFields(studio.metadata, nextFields),
    );

    return nextFields;
  }

  private async findStudioOrThrow(
    uid: string,
    ...args: Parameters<StudioRepository['findByUid']> extends [string, ...infer R] ? R : never
  ): Promise<NonNullable<Awaited<ReturnType<StudioRepository['findByUid']>>>> {
    const studio = await this.studioRepository.findByUid(uid, ...args);
    if (!studio) {
      throw HttpError.notFound('Studio', uid);
    }
    return studio as NonNullable<Awaited<ReturnType<StudioRepository['findByUid']>>>;
  }

  private readSharedFields(studio: Studio): SharedField[] {
    const metadata = this.toMetadataObject(studio.metadata);
    const candidate = metadata.shared_fields;
    if (candidate === undefined) {
      return [];
    }

    const parsed = sharedFieldsListSchema.safeParse(candidate);
    if (!parsed.success) {
      throw HttpError.internalServerError('Studio shared_fields metadata is invalid');
    }

    return parsed.data;
  }

  private withSharedFields(metadata: Studio['metadata'], sharedFields: SharedField[]): Record<string, unknown> {
    const metadataObj = this.toMetadataObject(metadata);
    return {
      ...metadataObj,
      shared_fields: sharedFields,
    };
  }

  private toMetadataObject(metadata: Studio['metadata']): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }

    return metadata as Record<string, unknown>;
  }
}
