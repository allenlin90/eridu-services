import { Module } from '@nestjs/common';

import { ScheduleSnapshotRepository } from './schedule-snapshot.repository';
import { ScheduleSnapshotService } from './schedule-snapshot.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, UidGeneratorModule],
  providers: [ScheduleSnapshotService, ScheduleSnapshotRepository],
  exports: [ScheduleSnapshotService],
})
export class ScheduleSnapshotModule {}
