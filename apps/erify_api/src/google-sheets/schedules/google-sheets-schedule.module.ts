import { Module } from '@nestjs/common';

import { GoogleSheetsScheduleController } from './google-sheets-schedule.controller';

import { ClientModule } from '@/models/client/client.module';
import { ScheduleModule } from '@/models/schedule/schedule.module';
import { UserModule } from '@/models/user/user.module';
import { SchedulePlanningModule } from '@/schedule-planning/schedule-planning.module';
import { UtilityModule } from '@/utility/utility.module';

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
