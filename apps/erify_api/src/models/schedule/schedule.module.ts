import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { UtilityModule } from '@/utility/utility.module';

import { ScheduleRepository } from './schedule.repository';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [PrismaModule, UtilityModule],
  providers: [ScheduleService, ScheduleRepository],
  exports: [ScheduleService],
})
export class ScheduleModule {}
