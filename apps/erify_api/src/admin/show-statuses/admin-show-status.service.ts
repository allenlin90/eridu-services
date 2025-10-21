import { Injectable } from '@nestjs/common';
import type { ShowStatus } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import {
  CreateShowStatusDto,
  UpdateShowStatusDto,
} from '../../show-status/schemas/show-status.schema';
import { ShowStatusService } from '../../show-status/show-status.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class AdminShowStatusService {
  constructor(
    private readonly showStatusService: ShowStatusService,
    private readonly utilityService: UtilityService,
  ) {}

  createShowStatus(data: CreateShowStatusDto) {
    return this.showStatusService.createShowStatus({
      name: data.name,
      metadata: data.metadata,
    });
  }

  getShowStatusById(uid: string) {
    return this.showStatusService.getShowStatusById(uid);
  }

  updateShowStatus(uid: string, data: UpdateShowStatusDto) {
    return this.showStatusService.updateShowStatus(uid, data);
  }

  deleteShowStatus(uid: string) {
    return this.showStatusService.deleteShowStatus(uid);
  }

  async getShowStatuses(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<ShowStatus>> {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const showStatuses = await this.showStatusService.getShowStatuses({
      skip,
      take,
    });

    const total = await this.showStatusService.countShowStatuses();
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: showStatuses, meta };
  }
}
