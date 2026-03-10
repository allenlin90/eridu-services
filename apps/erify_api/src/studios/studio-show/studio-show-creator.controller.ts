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
import { CreatorRepository } from '@/models/creator/creator.repository';
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
    private readonly creatorRepository: CreatorRepository,
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

    const creator = await this.creatorRepository.findByUid(body.creator_id);
    if (!creator) {
      throw HttpError.notFound('Creator not found');
    }

    const existing = await this.showCreatorRepository.findMany({
      where: { showId: show.id, mcId: creator.id },
    });
    const existingRecord = existing[0];

    let result;
    if (existingRecord) {
      if (existingRecord.deletedAt === null) {
        throw HttpError.badRequest('Creator is already assigned to this show');
      }
      result = await this.showCreatorRepository.restoreAndUpdateAssignment(existingRecord.id, {
        note: body.note,
        agreedRate: body.agreed_rate !== undefined ? body.agreed_rate.toFixed(2) : undefined,
        compensationType: body.compensation_type,
        commissionRate: body.commission_rate !== undefined ? body.commission_rate.toFixed(2) : undefined,
      });
    } else {
      const uid = this.generateShowCreatorUid();
      result = await this.showCreatorRepository.createAssignment({
        uid,
        showId: show.id,
        mcId: creator.id,
        note: body.note,
        agreedRate: body.agreed_rate !== undefined ? body.agreed_rate.toFixed(2) : undefined,
        compensationType: body.compensation_type,
        commissionRate: body.commission_rate !== undefined ? body.commission_rate.toFixed(2) : undefined,
      });
    }

    return this.showCreatorRepository.findByUid(result.uid, { show: true, mc: true });
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

    const creator = await this.creatorRepository.findByUid(creatorId);
    if (!creator) {
      throw HttpError.notFound('Creator not found');
    }

    const assignments = await this.showCreatorRepository.findMany({
      where: { showId: show.id, mcId: creator.id, deletedAt: null },
      include: { show: true, mc: true },
    });

    const assignment = assignments[0];
    if (!assignment) {
      throw HttpError.notFound('Creator is not assigned to this show');
    }

    await this.showCreatorRepository.softDelete({ id: assignment.id });
    return assignment;
  }

  private generateShowCreatorUid(): string {
    return this.showCreatorService.generateShowCreatorUid();
  }

  private async resolveShow(showUid: string, studioUid: string) {
    const show = await this.showService.getShowById(showUid, { studio: true });
    if (show.studio?.uid !== studioUid) {
      throw HttpError.forbidden('Show does not belong to this studio');
    }
    return show;
  }
}
