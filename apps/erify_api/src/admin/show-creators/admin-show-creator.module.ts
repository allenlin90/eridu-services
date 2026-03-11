import { Module } from '@nestjs/common';

import { AdminShowCreatorController } from './admin-show-creator.controller';

import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowMcModule, UtilityModule],
  controllers: [AdminShowCreatorController],
})
export class AdminShowCreatorModule {}
