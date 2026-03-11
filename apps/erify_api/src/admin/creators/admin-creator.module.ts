import { Module } from '@nestjs/common';

import { AdminCreatorController } from './admin-creator.controller';

import { McModule } from '@/models/mc/mc.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [McModule, UtilityModule],
  controllers: [AdminCreatorController],
})
export class AdminCreatorModule {}
