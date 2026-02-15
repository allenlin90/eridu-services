import { Module } from '@nestjs/common';

import { TaskTemplateRepository } from './task-template.repository';
import { TaskTemplateService } from './task-template.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [TaskTemplateService, TaskTemplateRepository],
  exports: [TaskTemplateService],
})
export class TaskTemplateModule {}
