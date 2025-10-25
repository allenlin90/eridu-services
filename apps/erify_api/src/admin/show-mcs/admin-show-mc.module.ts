import { Module } from '@nestjs/common';

import { ShowMcModule } from '../../show-mc/show-mc.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowMcController } from './admin-show-mc.controller';

@Module({
  imports: [ShowMcModule, UtilityModule],
  controllers: [AdminShowMcController],
})
export class AdminShowMcModule {}
