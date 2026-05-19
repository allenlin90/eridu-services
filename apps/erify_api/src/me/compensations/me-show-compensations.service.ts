import { Injectable } from '@nestjs/common';

import { HttpError } from '@/lib/errors/http-error.util';
import { CreatorService } from '@/models/creator/creator.service';
import { UserService } from '@/models/user/user.service';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

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
    private readonly showOrchestrationService: ShowOrchestrationService,
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

    return this.showOrchestrationService.getCreatorCompensations(params.studioId, creator.uid, {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
  }
}
