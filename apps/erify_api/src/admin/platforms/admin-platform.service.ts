import { Injectable } from '@nestjs/common';
import type { Platform } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import { PlatformService } from '../../platform/platform.service';
import {
  CreatePlatformDto,
  UpdatePlatformDto,
} from '../../platform/schemas/platform.schema';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class AdminPlatformService {
  constructor(
    private readonly platformService: PlatformService,
    private readonly utilityService: UtilityService,
  ) {}

  createPlatform(data: CreatePlatformDto) {
    return this.platformService.createPlatform({
      name: data.name,
      apiConfig: data.apiConfig,
      metadata: data.metadata,
    });
  }

  getPlatformById(uid: string) {
    return this.platformService.getPlatformById(uid);
  }

  updatePlatform(uid: string, data: UpdatePlatformDto) {
    return this.platformService.updatePlatform(uid, data);
  }

  deletePlatform(uid: string) {
    return this.platformService.deletePlatform(uid);
  }

  async getPlatforms(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<Platform>> {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const platforms = await this.platformService.getPlatforms({ skip, take });

    const total = await this.platformService.countPlatforms();
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: platforms, meta };
  }
}
