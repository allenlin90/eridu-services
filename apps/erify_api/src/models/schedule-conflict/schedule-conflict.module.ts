import { Module } from '@nestjs/common';

import { ScheduleConflictService } from './schedule-conflict.service';

import { AuditModule } from '@/models/audit/audit.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [PrismaModule, AuditModule, UtilityModule],
  providers: [ScheduleConflictService],
  exports: [ScheduleConflictService],
})
export class ScheduleConflictModule {}
