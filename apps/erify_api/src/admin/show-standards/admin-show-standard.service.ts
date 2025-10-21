import { Injectable } from '@nestjs/common';
import type { ShowStandard } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import {
  CreateShowStandardDto,
  UpdateShowStandardDto,
} from '../../show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '../../show-standard/show-standard.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class AdminShowStandardService {
  constructor(
    private readonly showStandardService: ShowStandardService,
    private readonly utilityService: UtilityService,
  ) {}

  createShowStandard(data: CreateShowStandardDto) {
    return this.showStandardService.createShowStandard({
      name: data.name,
      metadata: data.metadata,
    });
  }

  getShowStandardById(uid: string) {
    return this.showStandardService.getShowStandardById(uid);
  }

  updateShowStandard(uid: string, data: UpdateShowStandardDto) {
    return this.showStandardService.updateShowStandard(uid, data);
  }

  deleteShowStandard(uid: string) {
    return this.showStandardService.deleteShowStandard(uid);
  }

  async getShowStandards(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<ShowStandard>> {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const showStandards = await this.showStandardService.getShowStandards({
      skip,
      take,
    });

    const total = await this.showStandardService.countShowStandards();
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: showStandards, meta };
  }
}
