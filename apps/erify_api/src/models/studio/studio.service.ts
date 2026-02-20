import { Injectable } from '@nestjs/common';
import type { Studio } from '@prisma/client';

import type {
  CreateStudioPayload,
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
}
