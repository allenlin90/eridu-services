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
  AddShowMcDto,
  ListShowMcsQueryDto,
  showMcDto,
} from './schemas/studio-show-mc.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodPaginatedResponse, ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { McRepository } from '@/models/mc/mc.repository';
import { McService } from '@/models/mc/mc.service';
import { ShowService } from '@/models/show/show.service';
import { ShowMcRepository } from '@/models/show-mc/show-mc.repository';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { StudioService } from '@/models/studio/studio.service';

@StudioProtected() // All studio members can view
@Controller('studios/:studioId/shows/:showId/mcs')
export class StudioShowMcController extends BaseStudioController {
  constructor(
    private readonly showService: ShowService,
    private readonly mcRepository: McRepository,
    private readonly showMcRepository: ShowMcRepository,
    private readonly showMcService: ShowMcService,
  ) {
    super();
  }

  /**
   * List MCs assigned to a show.
   */
  @Get()
  @ZodPaginatedResponse(showMcDto)
  async index(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
    @Query() query: ListShowMcsQueryDto,
  ) {
    const show = await this.resolveShow(showId, studioId);

    const { data, total } = await this.showMcRepository.findPaginated({
      showId: show.id,
      skip: query.skip,
      take: query.take,
    });

    return this.createPaginatedResponse(data, total, this.toPaginationQuery(query));
  }

  /**
   * Add an MC to a show.
   */
  @Post()
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(showMcDto, HttpStatus.CREATED)
  async addMc(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
    @Body() body: AddShowMcDto,
  ) {
    const show = await this.resolveShow(showId, studioId);

    const mc = await this.mcRepository.findByUid(body.mc_id);
    if (!mc) {
      throw HttpError.notFound('MC not found');
    }

    // Check for existing (including soft-deleted) assignment
    const existing = await this.showMcRepository.findMany({
      where: { showId: show.id, mcId: mc.id },
    });
    const existingRecord = existing[0];

    let result;
    if (existingRecord) {
      if (existingRecord.deletedAt === null) {
        throw HttpError.badRequest('MC is already assigned to this show');
      }
      // Restore soft-deleted assignment
      result = await this.showMcRepository.restoreAndUpdateAssignment(existingRecord.id, {
        note: body.note,
        agreedRate: body.agreed_rate !== undefined ? body.agreed_rate.toFixed(2) : undefined,
        compensationType: body.compensation_type,
        commissionRate: body.commission_rate !== undefined ? body.commission_rate.toFixed(2) : undefined,
      });
    } else {
      const uid = this.showMcService.generateShowMcUid();
      result = await this.showMcRepository.createAssignment({
        uid,
        showId: show.id,
        mcId: mc.id,
        note: body.note,
        agreedRate: body.agreed_rate !== undefined ? body.agreed_rate.toFixed(2) : undefined,
        compensationType: body.compensation_type,
        commissionRate: body.commission_rate !== undefined ? body.commission_rate.toFixed(2) : undefined,
      });
    }

    // Re-fetch with relations for response
    return this.showMcRepository.findByUid(result.uid, { show: true, mc: true });
  }

  /**
   * Remove an MC from a show.
   * :mcId is the MC UID (not the ShowMC UID).
   */
  @Delete(':mcId')
  @StudioProtected([STUDIO_ROLE.ADMIN, STUDIO_ROLE.MANAGER, STUDIO_ROLE.TALENT_MANAGER])
  @ZodResponse(showMcDto)
  async removeMc(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('showId', new UidValidationPipe(ShowService.UID_PREFIX, 'Show')) showId: string,
    @Param('mcId', new UidValidationPipe(McService.UID_PREFIX, 'MC')) mcId: string,
  ) {
    const show = await this.resolveShow(showId, studioId);

    const mc = await this.mcRepository.findByUid(mcId);
    if (!mc) {
      throw HttpError.notFound('MC not found');
    }

    const assignments = await this.showMcRepository.findMany({
      where: { showId: show.id, mcId: mc.id, deletedAt: null },
      include: { show: true, mc: true },
    });

    const assignment = assignments[0];
    if (!assignment) {
      throw HttpError.notFound('MC is not assigned to this show');
    }

    await this.showMcRepository.softDelete({ id: assignment.id });
    return assignment;
  }

  /**
   * Resolves show by UID and validates it belongs to the studio.
   */
  private async resolveShow(showUid: string, studioUid: string) {
    const show = await this.showService.getShowById(showUid, { studio: true });
    if (show.studio?.uid !== studioUid) {
      throw HttpError.forbidden('Show does not belong to this studio');
    }
    return show;
  }
}
