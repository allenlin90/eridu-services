import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';

import { HttpError } from '../../common/errors/http-error.util';
import { McService } from '../../mc/mc.service';
import { CreateMcDto, UpdateMcDto } from '../../mc/schemas/mc.schema';
import { UserService } from '../../user/user.service';
import { UtilityService } from '../../utility/utility.service';

type MCWithUser = Prisma.MCGetPayload<{ include: { user: true } }>;

@Injectable()
export class AdminMcService {
  constructor(
    private readonly mcService: McService,
    private readonly userService: UserService,
    private readonly utilityService: UtilityService,
  ) {}

  async createMc(data: CreateMcDto) {
    let user: User | null = null;

    if (data.userId) {
      user = await this.userService.findUserById(data.userId);

      if (!user) {
        throw HttpError.badRequest(`user_id: ${data.userId} not found`);
      }
    }

    // Use destructuring to exclude userId and add resolved userId
    const { userId: _userId, ...restData } = data;
    const payload = {
      ...restData,
      userId: user?.id ?? null,
    };

    return this.mcService.createMc(payload, {
      user: true,
    });
  }

  async getMcById(uid: string) {
    const mc = await this.mcService.getMcById(uid, {
      user: true,
    });

    return mc;
  }

  async updateMc(uid: string, data: UpdateMcDto) {
    let updateData: Prisma.MCUpdateInput = { ...data };

    if (data.userId) {
      const user = await this.userService.findUserById(data.userId);

      if (!user) {
        throw HttpError.badRequest(`user_id: ${data.userId} not found`);
      }

      // Use destructuring to exclude userId and add user relation
      const { userId: _userId, ...restData } = data;
      updateData = {
        ...restData,
        user: { connect: { id: user.id } },
      };
    }

    return this.mcService.updateMc(uid, updateData, {
      user: true,
    });
  }

  deleteMc(uid: string) {
    return this.mcService.deleteMc(uid);
  }

  async getMcs(params: {
    page: number;
    limit: number;
    skip: number;
    take: number;
  }) {
    const page = params.page;
    const limit = params.limit;
    const skip = params.skip;
    const take = params.take;

    const mcs = await this.mcService.getMcs({ skip, take }, { user: true });

    const total = await this.mcService.countMcs();
    const meta = this.utilityService.createPaginationMeta(page, limit, total);

    return { data: mcs as MCWithUser[], meta };
  }
}
