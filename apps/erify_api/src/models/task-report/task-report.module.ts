import { Module } from '@nestjs/common';

import { TaskReportDefinitionRepository } from './task-report-definition.repository';
import { TaskReportDefinitionService } from './task-report-definition.service';
import { TaskReportRunService } from './task-report-run.service';
import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

import { StudioModule } from '@/models/studio/studio.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, StudioModule, UserModule],
  providers: [
    TaskReportDefinitionRepository,
    TaskReportDefinitionService,
    TaskReportScopeRepository,
    TaskReportScopeService,
    TaskReportRunService,
  ],
  exports: [
    TaskReportDefinitionService,
    TaskReportScopeService,
    TaskReportRunService,
  ],
})
export class TaskReportModule {}
