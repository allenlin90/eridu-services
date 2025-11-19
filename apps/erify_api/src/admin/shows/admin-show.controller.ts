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
import {
  ListShowsQueryDto,
  UpdateShowDto,
} from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import {
  CreateShowWithAssignmentsDto,
  RemoveMcsFromShowDto,
  RemovePlatformsFromShowDto,
  ReplaceMcsOnShowDto,
  ReplacePlatformsOnShowDto,
  showWithAssignmentsDto,
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
    const show =
      await this.showOrchestrationService.createShowWithAssignments(body);
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
    const result =
      await this.showOrchestrationService.getPaginatedShowsWithRelations(query);
    const { shows, total } = result;

    return this.createPaginatedResponse(shows, total, query);
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
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async deleteShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
  ) {
    await this.showOrchestrationService.deleteShow(id);
  }

  @Patch(':id/mcs/remove')
  @AdminResponse(undefined, HttpStatus.NO_CONTENT)
  async removeMCsFromShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: RemoveMcsFromShowDto,
  ) {
    await this.showOrchestrationService.removeMCsFromShow(id, body.mcIds);
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

  @Patch(':id/mcs/replace')
  @AdminResponse(
    showWithAssignmentsDto,
    HttpStatus.OK,
    'MCs replaced on show successfully',
  )
  async replaceMCsOnShow(
    @Param('id', new UidValidationPipe(ShowService.UID_PREFIX, 'Show'))
    id: string,
    @Body() body: ReplaceMcsOnShowDto,
  ) {
    return await this.showOrchestrationService.replaceMCsForShow(id, body.mcs);
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
