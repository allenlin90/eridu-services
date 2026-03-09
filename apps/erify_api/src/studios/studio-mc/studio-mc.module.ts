import { Module } from '@nestjs/common';

import { StudioMcController } from './studio-mc.controller';

import { McModule } from '@/models/mc/mc.module';
import { StudioMcModelModule } from '@/models/studio-mc/studio-mc.module';

@Module({
  imports: [McModule, StudioMcModelModule],
  controllers: [StudioMcController],
})
export class StudioMcModule {}
