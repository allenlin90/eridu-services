import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { UserService } from '@/models/user/user.service';

type ListSelfShiftCompensationsParams = {
  studioId: string;
  dateFrom: Date;
  dateTo: Date;
};

@Injectable()
export class MeShiftCompensationsService {
  constructor(
    private readonly userService: UserService,
    private readonly studioMembershipService: StudioMembershipService,
    private readonly studioShiftService: StudioShiftService,
  ) {}

  async listSelfShiftCompensations(userExtId: string, params: ListSelfShiftCompensationsParams) {
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    const member = await this.studioMembershipService.findStudioMemberByUserAndStudio(
      user.uid,
      params.studioId,
    );
    if (!member) {
      throw HttpError.notFound('Membership', `user=${user.uid} studio=${params.studioId}`);
    }

    const shifts = await this.studioShiftService.listMemberCompensationShifts({
      studioId: params.studioId,
      userId: member.user.uid,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });

    return {
      member,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      shifts,
    };
  }
}
