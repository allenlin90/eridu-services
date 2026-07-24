import { Module } from '@nestjs/common';

import { TaskReportDefinitionRepository } from './task-report-definition.repository';
import { TaskReportDefinitionService } from './task-report-definition.service';
import { TaskReportRunService } from './task-report-run.service';
import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { StudioModule } from '@/models/studio/studio.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, StudioModule, UserModule],
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
