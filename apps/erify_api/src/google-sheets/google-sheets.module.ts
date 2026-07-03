import { Module } from '@nestjs/common';

import { GoogleSheetsCreatorModule } from './creators/google-sheets-creator.module';
import { GoogleSheetsScheduleModule } from './schedules/google-sheets-schedule.module';

@Module({
  imports: [GoogleSheetsScheduleModule, GoogleSheetsCreatorModule],
  exports: [GoogleSheetsScheduleModule, GoogleSheetsCreatorModule],
})
export class GoogleSheetsModule {}
