import { Module } from '@nestjs/common';

import { ClientModule } from '@/models/client/client.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { UserModule } from '@/models/user/user.module';
import { SchedulePlanningModule } from '@/schedule-planning/schedule-planning.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminScheduleController } from './admin-schedule.controller';

@Module({
  imports: [
    ScheduleModule,
    SchedulePlanningModule,
    UserModule,
    ClientModule,
    UtilityModule,
  ],
  controllers: [AdminScheduleController],
})
export class AdminScheduleModule {}
