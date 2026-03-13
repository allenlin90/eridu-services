import { Module } from '@nestjs/common';

import { StudioCreatorController } from './studio-creator.controller';

import { StudioCreatorModelModule } from '@/models/studio-creator/studio-creator.module';

@Module({
  imports: [StudioCreatorModelModule],
  controllers: [StudioCreatorController],
})
export class StudioCreatorApiModule {}
