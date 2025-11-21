import { Module } from '@nestjs/common';

import { ClientModule } from '@/models/client/client.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { UserModule } from '@/models/user/user.module';
import { SchedulePlanningModule } from '@/schedule-planning/schedule-planning.module';
import { UtilityModule } from '@/utility/utility.module';

import { GoogleSheetsScheduleController } from './google-sheets-schedule.controller';

@Module({
  imports: [
    ScheduleModule,
    SchedulePlanningModule,
    UserModule,
    ClientModule,
    UtilityModule,
  ],
  controllers: [GoogleSheetsScheduleController],
})
export class GoogleSheetsScheduleModule {}
