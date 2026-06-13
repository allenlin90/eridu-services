import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { CreatorService } from '@/models/creator/creator.service';
import { UserService } from '@/models/user/user.service';
import { CreatorCompensationService } from '@/show-orchestration/creator-compensation.service';

type ListSelfShowCompensationsParams = {
  studioId: string;
  dateFrom: Date;
  dateTo: Date;
};

@Injectable()
export class MeShowCompensationsService {
  constructor(
    private readonly userService: UserService,
    private readonly creatorService: CreatorService,
    private readonly creatorCompensationService: CreatorCompensationService,
  ) {}

  async listSelfShowCompensations(userExtId: string, params: ListSelfShowCompensationsParams) {
    const user = await this.userService.getUserByExtId(userExtId);
    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    const creator = await this.creatorService.findByUserUid(user.uid);
    if (!creator) {
      throw HttpError.notFound('Creator', `user=${user.uid}`);
    }

    return this.creatorCompensationService.getCreatorCompensations(params.studioId, creator.uid, {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
  }
}
