import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import type { ListMyStudioShiftsQuery } from '@/models/studio-shift/schemas/studio-shift.schema';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { UserService } from '@/models/user/user.service';

@Injectable()
export class MeShiftsService {
  constructor(
    private readonly userService: UserService,
    private readonly studioShiftService: StudioShiftService,
  ) {}

  async listMyShifts(userExtId: string, query: ListMyStudioShiftsQuery) {
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    // No studio existence check — an unknown/non-member studio_id naturally
    // returns zero results since shifts are always user-scoped. A 404 here
    // would leak studio existence to any authenticated user.
    return this.studioShiftService.listUserShifts(user.uid, query);
  }
}
