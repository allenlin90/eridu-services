import { Module } from '@nestjs/common';

import { StudioCreatorController } from './studio-creator.controller';
import { StudioMcController } from './studio-mc.controller';

import { McModule } from '@/models/mc/mc.module';
import { StudioMcModelModule } from '@/models/studio-mc/studio-mc.module';

@Module({
  imports: [McModule, StudioMcModelModule],
  controllers: [StudioMcController, StudioCreatorController],
})
export class StudioMcModule {}
