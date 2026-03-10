import { Module } from '@nestjs/common';

import { StudioCreatorController } from './studio-creator.controller';

import { CreatorModule } from '@/models/creator/creator.module';
import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';

@Module({
  imports: [CreatorModule, StudioCreatorModelModule],
  controllers: [StudioCreatorController],
})
export class StudioCreatorModule {}
