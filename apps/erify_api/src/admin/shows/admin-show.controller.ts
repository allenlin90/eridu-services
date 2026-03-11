import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { BaseAdminController } from '@/admin/base-admin.controller';
import {
  AdminPaginatedResponse,
  AdminResponse,
} from '@/admin/decorators/admin-response.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import {
  CreateShowWithAssignmentsDto,
  RemoveCreatorsFromShowDto,
  RemovePlatformsFromShowDto,
  ReplaceCreatorsOnShowDto,
  ReplacePlatformsOnShowDto,
  showWithAssignmentsDto,
  UpdateShowWithAssignmentsDto,
} from '@/show-orchestration/schemas/show-orchestration.schema';
import { ShowOrchestrationService } from '@/show-orchestration/show-orchestration.service';

@Controller('admin/shows')
export class AdminShowController extends BaseAdminController {
  constructor(
    private readonly showOrchestrationService: ShowOrchestrationService,
  ) {
    super();
  }

  @Post()
  @AdminResponse(
    showWithAssignmentsDto,
    HttpStatus.CREATED,
    'Show created successfully with assignments',
  )
  async createShow(@Body() body: CreateShowWithAssignmentsDto) {
    const show
      = await this.showOrchestrationService.createShowWithAssignments(body);
    // Fetch with relations for proper serialization
    return this.showOrchestrationService.getShowWithRelations(show.uid);
  }

  @Get()
  @AdminPaginatedResponse(
    showWithAssignmentsDto,
    'List of shows with pagination and filtering',
  )
  async getShows(@Query() query: ListShowsQueryDto) {
    // Zod validates and transforms at runtime, so all required properties exist
    const result
      = await this.showOrchestrationService.getPaginatedShowsWithRelations(query);
    const { data, total } = result;

    return this.createPaginatedResponse(data, total, query);
  }

  @Get(':id')
  @AdminResponse(
    showWithAssignmentsDto,
    HttpStatus.OK,
    'Show details with assignments',
  )
  getShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
  ) {
    return this.showOrchestrationService.getShowWithRelations(id);
  }

  @Patch(':id')
  @AdminResponse(
    showWithAssignmentsDto,
    HttpStatus.OK,
    'Show updated successfully with assignments',
  )
  async updateShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: UpdateShowWithAssignmentsDto,
  ) {
    const show = await this.showOrchestrationService.updateShowWithAssignments(
      id,
      body,
    );
    // Service already returns show with relations
    return show;
  }

  @Delete(':id')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
  ) {
    await this.showOrchestrationService.deleteShow(id);
  }

  @Patch(':id/creators/remove')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async removeCreatorsFromShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: RemoveCreatorsFromShowDto,
  ) {
    await this.showOrchestrationService.removeCreatorsFromShow(
      id,
      body.creatorIds,
    );
  }

  @Patch(':id/platforms/remove')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
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

  @Patch(':id/creators/replace')
  @AdminResponse(
    showWithAssignmentsDto,
    HttpStatus.OK,
    'Creators replaced on show successfully',
  )
  async replaceCreatorsOnShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: ReplaceCreatorsOnShowDto,
  ) {
    return await this.showOrchestrationService.replaceCreatorsForShow(
      id,
      body.creators,
    );
  }

  @Patch(':id/platforms/replace')
  @AdminResponse(
    showWithAssignmentsDto,
    HttpStatus.OK,
    'Platforms replaced on show successfully',
  )
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
