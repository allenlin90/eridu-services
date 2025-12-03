import { Module } from '@nestjs/common';

import { GoogleSheetsScheduleModule } from './schedules/google-sheets-schedule.module';

@Module({
  imports: [GoogleSheetsScheduleModule],
  exports: [GoogleSheetsScheduleModule],
})
export class GoogleSheetsModule {}
