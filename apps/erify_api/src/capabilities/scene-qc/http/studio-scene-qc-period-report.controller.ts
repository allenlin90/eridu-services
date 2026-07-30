import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { sceneQcPeriodReportSchema } from '@eridu/api-types/scene-qc';

import { SceneQcPeriodReportService } from '../scene-qc-period-report.service';
import { SceneQcPeriodReportQueryDto } from '../schemas/scene-qc-period-report.schema';

import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { BaseStudioController } from '@/studios/base-studio.controller';

@ApiTags('Studio Scene QC Reports')
@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/scene-qc-reports')
export class StudioSceneQcPeriodReportController extends BaseStudioController {
  constructor(private readonly reportService: SceneQcPeriodReportService) {
    super();
  }

  @ApiOperation({ summary: 'Confirmed Scene QC analytics for a week, month, quarter, or custom date range' })
  @Get('period')
  @ReadBurstThrottle()
  @ZodResponse(sceneQcPeriodReportSchema)
  getPeriodReport(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Query() query: SceneQcPeriodReportQueryDto,
  ) {
    return this.reportService.getReport(studioId, query.dateFrom, query.dateTo);
  }
}
