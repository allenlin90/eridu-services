import { Injectable } from '@nestjs/common';

import type {
  CreatePlatformPayload,
  UpdatePlatformPayload,
} from './schemas/platform.schema';
import { PlatformRepository } from './platform.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class PlatformService extends BaseModelService {
  static readonly UID_PREFIX = 'plt';
  protected readonly uidPrefix = PlatformService.UID_PREFIX;

  constructor(
    private readonly platformRepository: PlatformRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createPlatform(payload: CreatePlatformPayload): ReturnType<PlatformRepository['create']> {
    const uid = this.generateUid();
    return this.platformRepository.create({ ...payload, uid });
  }

  async getPlatformById(
    ...args: Parameters<PlatformRepository['findOne']>
  ): ReturnType<PlatformRepository['findOne']> {
    return this.platformRepository.findOne(...args);
  }

  async listPlatforms(
    ...args: Parameters<PlatformRepository['findPaginated']>
  ): ReturnType<PlatformRepository['findPaginated']> {
    return this.platformRepository.findPaginated(...args);
  }

  async updatePlatform(
    uid: string,
    payload: UpdatePlatformPayload,
  ): ReturnType<PlatformRepository['update']> {
    return this.platformRepository.update({ uid }, payload);
  }

  async deletePlatform(uid: string): ReturnType<PlatformRepository['softDelete']> {
    return this.platformRepository.softDelete({ uid });
  }
}
