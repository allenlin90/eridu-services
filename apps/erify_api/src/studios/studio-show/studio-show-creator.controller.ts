import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { BaseStudioController } from '../base-studio.controller';

import {
  AddShowCreatorDto,
  ListShowCreatorsQueryDto,
  showCreatorDto,
} from './schemas/studio-show-creator.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { CreatorService } from '@/models/creator/creator.service';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { StudioService } from '@/models/studio/studio.service';

@StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
@Controller('studios/:studioId/shows/:showId/creators')
export class StudioShowCreatorController extends BaseStudioController {
  constructor(
    private readonly showService: ShowService,
    private readonly showCreatorRepository: ShowCreatorRepository,
    private readonly showCreatorService: ShowCreatorService,
  ) {
    super();
  }

  @Get()
  @ZodPaginatedResponse(showCreatorDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
    @Query() query: ListShowCreatorsQueryDto,
  ) {
    const show = await this.resolveShow(showId, studioId);

    const { data, total } = await this.showCreatorRepository.findPaginated({
      showId: show.id,
      skip: query.skip,
      take: query.take,
    });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  @Post()
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(showCreatorDto, HttpStatus.CREATED)
  async addCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
    @Body() body: AddShowCreatorDto,
  ) {
    const show = await this.resolveShow(showId, studioId);

    return this.showCreatorService.addCreatorToShow(show.id, body.creator_id, {
      note: body.note,
      agreedRate: body.agreed_rate,
      compensationType: body.compensation_type,
      commissionRate: body.commission_rate,
    });
  }

  @Delete(':creatorId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(showCreatorDto)
  async removeCreator(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
    @Param('creatorId', new UidValidationPipe(CreatorService.VALID_UID_PREFIXES, 'Creator')) creatorId: string,
  ) {
    const show = await this.resolveShow(showId, studioId);

    return this.showCreatorService.removeCreatorFromShow(show.id, creatorId);
  }

  private async resolveShow(showUid: string, studioUid: string) {
    const show = await this.showService.getShowById(showUid, { studio: true });
    if (show.studio?.uid !== studioUid) {
      throw HttpError.forbidden('Show does not belong to this studio');
    }
    return show;
  }
}
