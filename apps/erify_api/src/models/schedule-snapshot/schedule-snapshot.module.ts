import { Module } from '@nestjs/common';

import { ScheduleSnapshotRepository } from './schedule-snapshot.repository';
import { ScheduleSnapshotService } from './schedule-snapshot.service';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ScheduleSnapshotService, ScheduleSnapshotRepository],
  exports: [ScheduleSnapshotService],
})
export class ScheduleSnapshotModule {}
