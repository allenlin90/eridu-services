import { Module } from '@nestjs/common';

import { TaskTemplateRepository } from './task-template.repository';
import { TaskTemplateService } from './task-template.service';

import { StudioModule } from '@/models/studio/studio.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule, StudioModule],
  providers: [TaskTemplateService, TaskTemplateRepository],
  exports: [TaskTemplateService],
})
export class TaskTemplateModule {}
