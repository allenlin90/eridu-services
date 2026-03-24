import { Module } from '@nestjs/common';

import { TaskTemplateRepository } from './task-template.repository';
import { TaskTemplateService } from './task-template.service';
import { TaskTemplateModeratorCsvService } from './task-template-moderator-csv.service';
import { TaskTemplateResetService } from './task-template-reset.service';

import { StudioModule } from '@/models/studio/studio.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, StudioModule],
  providers: [TaskTemplateService, TaskTemplateRepository, TaskTemplateResetService, TaskTemplateModeratorCsvService],
  exports: [TaskTemplateService, TaskTemplateResetService, TaskTemplateModeratorCsvService],
})
export class TaskTemplateModule {}
