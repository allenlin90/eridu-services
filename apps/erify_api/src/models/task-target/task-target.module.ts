import { Module } from '@nestjs/common';

import { TaskTargetRepository } from './task-target.repository';
import { TaskTargetService } from './task-target.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [TaskTargetService, TaskTargetRepository],
  exports: [TaskTargetService],
})
export class TaskTargetModule {}
