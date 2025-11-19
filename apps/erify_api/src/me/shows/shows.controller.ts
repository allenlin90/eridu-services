import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { ApiZodResponse } from '@/lib/openapi/decorators';
import {
  createPaginatedResponseSchema,
  createPaginationMeta,
  PaginationQueryDto,
} from '@/lib/pagination/pagination.schema';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { showDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';

import { ShowsService } from './shows.service';

/**
 * Shows Controller
 *
 * User-scoped endpoint for MC users to query their assigned shows.
 * Authentication is handled by JWT guard requiring valid tokens.
 *
 * Endpoints:
 * - GET /me/shows - List shows assigned to the authenticated MC user
 * - GET /me/shows/:show_id - Get details of a specific show assigned to the authenticated MC user
 */
@Controller('me/shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(showDto),
    'List of shows assigned to the authenticated MC user',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(showDto))
  async getShows(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    const userIdentifier = user.ext_id;

    const { shows, total } = await this.showsService.getShowsForMcUser(
      userIdentifier,
      {
        skip: query.skip,
        take: query.take,
        orderBy: {
          startTime: 'desc',
        },
      },
    );

    const meta = createPaginationMeta(query.page, query.limit, total);

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
    @CurrentUser() user: AuthenticatedUser,
    @Param('show_id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    showId: string,
  ) {
    const userIdentifier = user.ext_id;

    const show = await this.showsService.getShowForMcUser(
      userIdentifier,
      showId,
    );

    return show;
  }
}
