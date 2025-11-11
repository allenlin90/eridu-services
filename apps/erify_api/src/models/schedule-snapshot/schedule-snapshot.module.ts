import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { ScheduleSnapshotRepository } from './schedule-snapshot.repository';
import { ScheduleSnapshotService } from './schedule-snapshot.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ScheduleSnapshotService, ScheduleSnapshotRepository],
  exports: [ScheduleSnapshotService],
})
export class ScheduleSnapshotModule {}
