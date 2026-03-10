import { Injectable } from '@nestjs/common';
import type { MC } from '@prisma/client';

import type {
  CreateCreatorPayload,
  UpdateCreatorPayload,
} from './schemas/creator.schema';
import { CreatorRepository } from './creator.repository';
import {
  CREATOR_UID_PREFIX,
  isCreatorUid,
  LEGACY_CREATOR_UID_PREFIX,
  VALID_CREATOR_UID_PREFIXES,
} from './creator-uid.util';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class CreatorService extends BaseModelService {
  static readonly UID_PREFIX = CREATOR_UID_PREFIX;
  static readonly LEGACY_UID_PREFIX = LEGACY_CREATOR_UID_PREFIX;
  static readonly VALID_UID_PREFIXES = VALID_CREATOR_UID_PREFIXES;
  protected readonly uidPrefix = CreatorService.UID_PREFIX;

  static isValidCreatorUid(value: string): boolean {
    return isCreatorUid(value);
  }

  constructor(
    private readonly creatorRepository: CreatorRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createCreator(
    payload: CreateCreatorPayload,
  ): ReturnType<CreatorRepository['createCreator']> {
    // Check if user is already assigned to a creator
    if (payload.userId) {
      const existing = await this.creatorRepository.findByUserUid(payload.userId);
      if (existing) {
        throw HttpError.badRequest('user is already a creator');
      }
    }

    const uid = this.generateUid();
    return this.creatorRepository.createCreator({ ...payload, uid });
  }

  async getCreatorById(uid: string): Promise<MC | null> {
    return this.creatorRepository.findByUid(uid);
  }

  async getCreatorByIdWithUser(uid: string) {
    return this.creatorRepository.findByUid(uid, { user: true });
  }

  /**
   * Internal findOne for flexibility if needed.
   */
  async findOne(
    ...args: Parameters<CreatorRepository['findOne']>
  ): ReturnType<CreatorRepository['findOne']> {
    return this.creatorRepository.findOne(...args);
  }

  async getCreatorByUserIdentifier(identifier: string): Promise<MC | null> {
    return this.creatorRepository.findByUserIdentifier(identifier);
  }

  /**
   * Lists creators with pagination and filtering.
   */
  listCreators(
    ...args: Parameters<CreatorRepository['findPaginated']>
  ): ReturnType<CreatorRepository['findPaginated']> {
    return this.creatorRepository.findPaginated(...args);
  }

  async updateCreator(
    uid: string,
    payload: UpdateCreatorPayload,
  ): ReturnType<CreatorRepository['updateCreatorByUid']> {
    // Check if user is already assigned to another creator
    if (payload.userId) {
      const existing = await this.creatorRepository.findByUserUid(payload.userId);
      if (existing && existing.uid !== uid) {
        throw HttpError.badRequest('user is already a creator');
      }
    }

    const existing = await this.creatorRepository.findByUid(uid);
    if (!existing) {
      throw HttpError.notFound('Creator not found');
    }
    return this.creatorRepository.updateCreatorByUid(existing.uid, payload);
  }

  async deleteCreator(
    uid: string,
  ): ReturnType<CreatorRepository['softDelete']> {
    const existing = await this.creatorRepository.findByUid(uid);
    if (!existing) {
      throw HttpError.notFound('Creator not found');
    }
    return this.creatorRepository.softDelete({ uid: existing.uid });
  }
}

export { CreatorService as McService };
