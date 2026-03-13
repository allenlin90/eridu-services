import { Injectable } from '@nestjs/common';

import { BaseModelService } from '@/lib/services/base-model.service';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class StudioCreatorService extends BaseModelService {
  static readonly UID_PREFIX = 'smc';
  protected readonly uidPrefix = StudioCreatorService.UID_PREFIX;

  constructor(
    private readonly studioCreatorRepository: StudioCreatorRepository,
    private readonly creatorRepository: CreatorRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  listRoster(
    studioUid: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      isActive?: boolean;
      defaultRateType?: string | null;
    },
  ): ReturnType<StudioCreatorRepository['findByStudioUidPaginated']> {
    return this.studioCreatorRepository.findByStudioUidPaginated(studioUid, params);
  }

  listCatalog(
    studioUid: string,
    params: {
      search?: string;
      includeRostered?: boolean;
      limit?: number;
    },
  ): ReturnType<CreatorRepository['findCatalogForStudio']> {
    return this.creatorRepository.findCatalogForStudio({
      studioUid,
      search: params.search,
      includeRostered: params.includeRostered,
      limit: params.limit,
    });
  }

  listAvailable(
    _studioUid: string,
    params: {
      dateFrom: Date;
      dateTo: Date;
      search?: string;
      limit?: number;
    },
  ): ReturnType<CreatorRepository['findAvailableForStudioWindow']> {
    return this.creatorRepository.findAvailableForStudioWindow({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      search: params.search,
      limit: params.limit,
    });
  }
}
