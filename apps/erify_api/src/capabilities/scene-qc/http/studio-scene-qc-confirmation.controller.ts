import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { sceneQcConfirmationSchema, sceneQcReportSchema } from '@eridu/api-types/scene-qc';
import { CurrentUser } from '@eridu/auth-sdk/adapters/nestjs/current-user.decorator';

import { SceneQcConfirmationWorkflowService } from '../scene-qc-confirmation-workflow.service';
import { SceneQcReportService } from '../scene-qc-report.service';
import { serializeSceneQcReportToCsv } from '../scene-qc-report-csv';
import { CreateSceneQcConfirmationDto } from '../schemas/scene-qc-confirmation.schema';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StudioProtected } from '@/lib/decorators/studio-protected.decorator';
import { ZodResponse } from '@/lib/decorators/zod-response.decorator';
import { ReadBurstThrottle } from '@/lib/guards/read-burst-throttle.decorator';
import { UidValidationPipe } from '@/lib/pipes/uid-validation.pipe';
import { StudioService } from '@/models/studio/studio.service';
import { BaseStudioController } from '@/studios/base-studio.controller';

/**
 * The §8.3 confirmation command plus the report JSON/CSV reads. Same role set
 * as the rest of the capability. See SCENE_QC_CHILD_PR_4_BREAKDOWN.md
 * section 1.4/1.8.
 */
@ApiTags('Studio Scene QC Confirmations')
@StudioProtected([STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN])
@Controller('studios/:studioId/scene-qc-confirmations')
export class StudioSceneQcConfirmationController extends BaseStudioController {
  constructor(
    private readonly workflowService: SceneQcConfirmationWorkflowService,
    private readonly reportService: SceneQcReportService,
  ) {
    super();
  }

  @ApiOperation({ summary: 'Confirm (or reconfirm) one operational day, appending a new revision when the scope has changed' })
  @Post()
  @ZodResponse(sceneQcConfirmationSchema, HttpStatus.OK)
  async confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Body() body: CreateSceneQcConfirmationDto,
  ) {
    return this.workflowService.confirmDay(studioId, body.operationalDate, {
      actorExtId: user.ext_id,
      studioUid: studioId,
    });
  }

  @ApiOperation({ summary: 'Manager report for one confirmation revision' })
  @Get(':confirmationId/report')
  @ReadBurstThrottle()
  @ZodResponse(sceneQcReportSchema)
  async report(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('confirmationId', new UidValidationPipe(UID_PREFIXES.SCENE_QC_CONFIRMATION, 'Scene QC confirmation'))
    confirmationId: string,
  ) {
    return this.reportService.getReport(studioId, confirmationId);
  }

  @ApiOperation({ summary: 'Manager report as CSV for one confirmation revision' })
  @Get(':confirmationId/report.csv')
  @ReadBurstThrottle()
  async reportCsv(
    @Param('studioId', new UidValidationPipe(StudioService.UID_PREFIX, 'Studio')) studioId: string,
    @Param('confirmationId', new UidValidationPipe(UID_PREFIXES.SCENE_QC_CONFIRMATION, 'Scene QC confirmation'))
    confirmationId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const report = await this.reportService.getReport(studioId, confirmationId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="scene-qc-report-${report.operational_date}-r${report.confirmation_revision}.csv"`,
    );
    return serializeSceneQcReportToCsv(report);
  }
}
