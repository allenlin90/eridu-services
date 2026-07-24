import { Module } from '@nestjs/common';

import { TaskTargetRepository } from './task-target.repository';
import { TaskTargetService } from './task-target.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [TaskTargetService, TaskTargetRepository],
  exports: [TaskTargetService],
})
export class TaskTargetModule {}
