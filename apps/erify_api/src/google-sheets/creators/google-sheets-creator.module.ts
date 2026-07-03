import { Module } from '@nestjs/common';

import { GoogleSheetsCreatorController } from './google-sheets-creator.controller';

import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';

@Module({
  imports: [StudioCreatorModelModule],
  controllers: [GoogleSheetsCreatorController],
})
export class GoogleSheetsCreatorModule {}
