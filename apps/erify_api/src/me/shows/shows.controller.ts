import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';

import { HttpError } from '@/common/errors/http-error.util';
import { ApiZodResponse } from '@/common/openapi/decorators';
import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import { createPaginatedResponseSchema } from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import { showDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { UtilityService } from '@/utility/utility.service';

import { ShowsService } from './shows.service';

/**
 * Shows Controller
 *
 * User-scoped endpoint for MC users to query their assigned shows.
 * Authentication will be handled by guards (to be implemented).
 *
 * Endpoints:
 * - GET /me/shows - List shows assigned to the authenticated MC user
 * - GET /me/shows/:show_id - Get details of a specific show assigned to the authenticated MC user
 */
@Controller('me/shows')
export class ShowsController {
  constructor(
    private readonly showsService: ShowsService,
    private readonly utilityService: UtilityService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(showDto),
    'List of shows assigned to the authenticated MC user',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(showDto))
  async getShows(@Req() request: Request, @Query() query: PaginationQueryDto) {
    // TODO: Replace with proper decorator once authentication is implemented
    // For now, assume user identifier (uid or extId) is available in request from JWT payload
    // This will be replaced with: @CurrentUser() user: { id: string }
    // Note: JWT guard sets request.user.id as a string (uid or extId), not the bigint database id
    const userIdentifier = (request as Request & { user?: { id: string } }).user
      ?.id;

    if (!userIdentifier) {
      throw HttpError.unauthorized(
        'User identifier not found in request. Authentication guard must set request.user.id (uid or extId)',
      );
    }

    const { shows, total } = await this.showsService.getShowsForMcUser(
      userIdentifier,
      {
        skip: query.skip,
        take: query.take,
        orderBy: {
          startTime: 'asc',
        },
      },
    );

    const meta = this.utilityService.createPaginationMeta(
      query.page,
      query.limit,
      total,
    );

    return {
      data: shows,
      meta,
    };
  }

  @Get(':show_id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showDto, 'Show details assigned to the authenticated MC user')
  @ZodSerializerDto(showDto)
  async getShow(
    @Req() request: Request,
    @Param('show_id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    showId: string,
  ) {
    // TODO: Replace with proper decorator once authentication is implemented
    // For now, assume user identifier (uid or extId) is available in request from JWT payload
    // This will be replaced with: @CurrentUser() user: { id: string }
    // Note: JWT guard sets request.user.id as a string (uid or extId), not the bigint database id
    const userIdentifier = (request as Request & { user?: { id: string } }).user
      ?.id;

    if (!userIdentifier) {
      throw HttpError.unauthorized(
        'User identifier not found in request. Authentication guard must set request.user.id (uid or extId)',
      );
    }

    const show = await this.showsService.getShowForMcUser(
      userIdentifier,
      showId,
    );

    return show;
  }
}
