import { Module } from '@nestjs/common';

import { AdminScheduleController } from './admin-schedule.controller';

import { ClientModule } from '@/models/client/client.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { UserModule } from '@/models/user/user.module';
import { SchedulePlanningModule } from '@/schedule-planning/schedule-planning.module';

@Module({
  imports: [
    ScheduleModule,
    SchedulePlanningModule,
    UserModule,
    ClientModule,
  ],
  controllers: [AdminScheduleController],
})
export class AdminScheduleModule {}
