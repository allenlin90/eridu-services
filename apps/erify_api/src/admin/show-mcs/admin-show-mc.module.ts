import { Module } from '@nestjs/common';

import { AdminShowMcController } from './admin-show-mc.controller';

import { ShowMcModule } from '@/models/show-mc/show-mc.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowMcModule, UtilityModule],
  controllers: [AdminShowMcController],
})
export class AdminShowMcModule {}
