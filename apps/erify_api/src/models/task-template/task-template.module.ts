import { Module } from '@nestjs/common';

import { TaskTemplateRepository } from './task-template.repository';
import { TaskTemplateService } from './task-template.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { StudioModule } from '@/models/studio/studio.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule, StudioModule],
  providers: [TaskTemplateService, TaskTemplateRepository],
  exports: [TaskTemplateService],
})
export class TaskTemplateModule {}
