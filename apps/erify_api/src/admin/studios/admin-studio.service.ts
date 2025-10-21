import { Injectable } from '@nestjs/common';
import type { Studio } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import {
  CreateStudioDto,
  UpdateStudioDto,
} from '../../studio/schemas/studio.schema';
import { StudioService } from '../../studio/studio.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class AdminStudioService {
  constructor(
    private readonly studioService: StudioService,
    private readonly utilityService: UtilityService,
  ) {}

  createStudio(data: CreateStudioDto) {
    return this.studioService.createStudio({
      name: data.name,
      address: data.address,
      metadata: data.metadata,
    });
  }

  getStudioById(uid: string) {
    return this.studioService.getStudioById(uid);
  }

  updateStudio(uid: string, data: UpdateStudioDto) {
    return this.studioService.updateStudio(uid, data);
  }

  deleteStudio(uid: string) {
    return this.studioService.deleteStudio(uid);
  }

  async getStudios(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<Studio>> {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const studios = await this.studioService.getStudios({ skip, take });

    const total = await this.studioService.countStudios();
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: studios, meta };
  }
}
