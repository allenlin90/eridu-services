import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioService } from '@/models/studio/studio.service';
import type { ListMyStudioShiftsQuery } from '@/models/studio-shift/schemas/studio-shift.schema';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { UserService } from '@/models/user/user.service';

@Injectable()
export class MeShiftsService {
  constructor(
    private readonly userService: UserService,
    private readonly studioService: StudioService,
    private readonly studioShiftService: StudioShiftService,
  ) {}

  async listMyShifts(userExtId: string, query: ListMyStudioShiftsQuery) {
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    if (query.studioId) {
      const studio = await this.studioService.findByUid(query.studioId);
      if (!studio) {
        throw HttpError.notFound('Studio not found');
      }
    }

    return this.studioShiftService.listUserShifts(user.uid, query);
  }
}
