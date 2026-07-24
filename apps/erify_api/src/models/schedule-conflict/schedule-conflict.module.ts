import { Module } from '@nestjs/common';

import { ScheduleConflictService } from './schedule-conflict.service';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { AuditModule } from '@/models/audit/audit.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuditModule, UidGeneratorModule],
  providers: [ScheduleConflictService],
  exports: [ScheduleConflictService],
})
export class ScheduleConflictModule {}
