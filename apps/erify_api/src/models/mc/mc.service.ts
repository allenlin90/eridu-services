import { Injectable } from '@nestjs/common';
import type { MC } from '@prisma/client';

import type {
  CreateMcPayload,
  UpdateMcPayload,
} from './schemas/mc.schema';
import { McRepository } from './mc.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { CREATOR_UID_PREFIX, toCreatorUid } from '@/models/creator/creator-uid.util';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class McService extends BaseModelService {
  static readonly UID_PREFIX = 'mc';
  protected readonly uidPrefix = CREATOR_UID_PREFIX;

  constructor(
    private readonly mcRepository: McRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createMc(
    payload: CreateMcPayload,
  ): ReturnType<McRepository['createMc']> {
    // Check if user is already assigned to an MC
    if (payload.userId) {
      const existing = await this.mcRepository.findByUserUid(payload.userId);
      if (existing) {
        throw HttpError.badRequest('user is already a mc');
      }
    }

    const uid = this.generateUid();
    return this.mcRepository.createMc({ ...payload, uid });
  }

  async getMcById(uid: string): Promise<MC | null> {
    return this.mcRepository.findByUid(uid);
  }

  async getMcByIdWithUser(uid: string) {
    return this.mcRepository.findByUid(uid, { user: true });
  }

  /**
   * Internal findOne for flexibility if needed.
   */
  async findOne(
    ...args: Parameters<McRepository['findOne']>
  ): ReturnType<McRepository['findOne']> {
    return this.mcRepository.findOne(...args);
  }

  async getMcByUserIdentifier(identifier: string): Promise<MC | null> {
    return this.mcRepository.findByUserIdentifier(identifier);
  }

  /**
   * Lists MCs with pagination and filtering.
   */
  listMcs(
    ...args: Parameters<McRepository['findPaginated']>
  ): ReturnType<McRepository['findPaginated']> {
    return this.mcRepository.findPaginated(...args);
  }

  async updateMc(
    uid: string,
    payload: UpdateMcPayload,
  ): ReturnType<McRepository['updateByUid']> {
    // Check if user is already assigned to another MC
    if (payload.userId) {
      const existing = await this.mcRepository.findByUserUid(payload.userId);
      if (
        existing
        && toCreatorUid(existing.uid) !== toCreatorUid(uid)
      ) {
        throw HttpError.badRequest('user is already a mc');
      }
    }

    return this.mcRepository.updateByUid(uid, payload);
  }

  async deleteMc(uid: string): Promise<MC> {
    const existing = await this.mcRepository.findByUid(uid);
    return this.mcRepository.softDelete({ uid: existing?.uid ?? uid });
  }
}
