import { Injectable } from '@nestjs/common';
import type { ShowType } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import {
  CreateShowTypeDto,
  UpdateShowTypeDto,
} from '../../show-type/schemas/show-type.schema';
import { ShowTypeService } from '../../show-type/show-type.service';
import { UtilityService } from '../../utility/utility.service';

@Injectable()
export class AdminShowTypeService {
  constructor(
    private readonly showTypeService: ShowTypeService,
    private readonly utilityService: UtilityService,
  ) {}

  createShowType(data: CreateShowTypeDto) {
    return this.showTypeService.createShowType({
      name: data.name,
      metadata: data.metadata,
    });
  }

  getShowTypeById(uid: string) {
    return this.showTypeService.getShowTypeById(uid);
  }

  updateShowType(uid: string, data: UpdateShowTypeDto) {
    return this.showTypeService.updateShowType(uid, data);
  }

  deleteShowType(uid: string) {
    return this.showTypeService.deleteShowType(uid);
  }

  async getShowTypes(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<ShowType>> {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const showTypes = await this.showTypeService.getShowTypes({ skip, take });

    const total = await this.showTypeService.countShowTypes();
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: showTypes, meta };
  }
}
