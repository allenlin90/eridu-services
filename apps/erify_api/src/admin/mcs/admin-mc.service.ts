import { Injectable } from '@nestjs/common';
import type { MC } from '@prisma/client';

import { PaginatedResponse } from '../../common/pagination/schema/pagination.schema';
import { McService } from '../../mc/mc.service';
import { CreateMcDto, UpdateMcDto } from '../../mc/schemas/mc.schema';

@Injectable()
export class AdminMcService {
  constructor(private readonly mcService: McService) {}

  createMc(data: CreateMcDto) {
    return this.mcService.createMc(data);
  }

  getMcById(uid: string) {
    return this.mcService.getMcById(uid);
  }

  updateMc(uid: string, data: UpdateMcDto) {
    return this.mcService.updateMc(uid, data);
  }

  deleteMc(uid: string) {
    return this.mcService.deleteMc(uid);
  }

  async getMcs(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }): Promise<PaginatedResponse<MC>> {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const mcs = await this.mcService.getMcs({ skip, take });

    const total = await this.mcService.countMcs();
    const totalPages = Math.ceil(total / limit);
    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return { data: mcs, meta };
  }
}
