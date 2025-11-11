import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';

import { BaseAdminController } from '@/admin/base-admin.controller';
import { ApiZodResponse } from '@/common/openapi/decorators';
import {
  createPaginatedResponseSchema,
  PaginationQueryDto,
} from '@/common/pagination/schema/pagination.schema';
import { UidValidationPipe } from '@/common/pipes/uid-validation.pipe';
import { UpdateShowDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import {
  CreateShowWithAssignmentsDto,
  RemoveMcsFromShowDto,
  RemovePlatformsFromShowDto,
  ReplaceMcsOnShowDto,
  ReplacePlatformsOnShowDto,
  ShowWithAssignmentsDto,
  showWithAssignmentsDto,
} from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';
import { UtilityService } from '@/utility/utility.service';

@Controller('admin/shows')
export class AdminShowController extends BaseAdminController {
  constructor(
    private readonly showOrchestrationService: ShowOrchestrationService,
    utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiZodResponse(
    showWithAssignmentsDto,
    'Show created successfully with assignments',
  )
  @ZodSerializerDto(ShowWithAssignmentsDto)
  async createShow(@Body() body: CreateShowWithAssignmentsDto) {
    const show =
      await this.showOrchestrationService.createShowWithAssignments(body);
    // Fetch with relations for proper serialization
    return this.showOrchestrationService.getShowWithRelations(show.uid);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    createPaginatedResponseSchema(showWithAssignmentsDto),
    'List of shows with pagination',
  )
  @ZodSerializerDto(createPaginatedResponseSchema(showWithAssignmentsDto))
  async getShows(@Query() query: PaginationQueryDto) {
    const data = await this.showOrchestrationService.getShowsWithRelations({
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: 'desc' },
    });
    const total = await this.showOrchestrationService
      .getShowsWithRelations({
        take: undefined,
        skip: undefined,
      })
      .then((shows) => (Array.isArray(shows) ? shows.length : 0));

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showWithAssignmentsDto, 'Show details with assignments')
  @ZodSerializerDto(ShowWithAssignmentsDto)
  getShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
  ) {
    return this.showOrchestrationService.getShowWithRelations(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    showWithAssignmentsDto,
    'Show updated successfully with assignments ',
  )
  @ZodSerializerDto(ShowWithAssignmentsDto)
  async updateShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: UpdateShowDto,
  ) {
    // Convert basic DTO to orchestration DTO with empty assignments
    // This allows updating core show attributes without affecting MC/platform assignments
    const orchestrationDto = {
      ...body,
      showMcs: undefined,
      showPlatforms: undefined,
    };
    const show = await this.showOrchestrationService.updateShowWithAssignments(
      id,
      orchestrationDto,
    );
    // Service already returns show with relations
    return show;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
  ) {
    await this.showOrchestrationService.deleteShow(id);
  }

  @Patch(':id/mcs/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMCsFromShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: RemoveMcsFromShowDto,
  ) {
    await this.showOrchestrationService.removeMCsFromShow(id, body.mcIds);
  }

  @Patch(':id/platforms/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePlatformsFromShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: RemovePlatformsFromShowDto,
  ) {
    await this.showOrchestrationService.removePlatformsFromShow(
      id,
      body.platformIds,
    );
  }

  @Patch(':id/mcs/replace')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(showWithAssignmentsDto, 'MCs replaced on show successfully')
  @ZodSerializerDto(ShowWithAssignmentsDto)
  async replaceMCsOnShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: ReplaceMcsOnShowDto,
  ) {
    return await this.showOrchestrationService.replaceMCsForShow(id, body.mcs);
  }

  @Patch(':id/platforms/replace')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(
    showWithAssignmentsDto,
    'Platforms replaced on show successfully',
  )
  @ZodSerializerDto(ShowWithAssignmentsDto)
  async replacePlatformsOnShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: ReplacePlatformsOnShowDto,
  ) {
    return await this.showOrchestrationService.replacePlatformsForShow(
      id,
      body.platforms,
    );
  }
}
