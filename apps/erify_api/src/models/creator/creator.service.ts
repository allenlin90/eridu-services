import { Injectable } from '@nestjs/common';
import type { Creator } from '@prisma/client';

import type {
  CreateCreatorPayload,
  UpdateCreatorPayload,
} from './schemas/creator.schema';
import { CreatorRepository } from './creator.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { CREATOR_UID_PREFIX } from '@/models/creator/creator-uid.util';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class CreatorService extends BaseModelService {
  static readonly UID_PREFIX = CREATOR_UID_PREFIX;
  protected readonly uidPrefix = CREATOR_UID_PREFIX;

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
        throw HttpError.badRequest('user is already assigned to a creator');
      }
    }

    const uid = this.generateUid();
    return this.creatorRepository.createCreator({ ...payload, uid });
  }

  async getCreatorById(uid: string): Promise<Creator | null> {
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

  async getCreatorByUserIdentifier(identifier: string): Promise<Creator | null> {
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
  ): ReturnType<CreatorRepository['updateByUid']> {
    // Check if user is already assigned to another Creator
    if (payload.userId) {
      const existing = await this.creatorRepository.findByUserUid(payload.userId);
      if (
        existing
        && existing.uid !== uid
      ) {
        throw HttpError.badRequest('user is already assigned to a creator');
      }
    }

    return this.creatorRepository.updateByUid(uid, payload);
  }

  async deleteCreator(uid: string): Promise<Creator> {
    const existing = await this.creatorRepository.findByUid(uid);
    return this.creatorRepository.softDelete({ uid: existing?.uid ?? uid });
  }
}
