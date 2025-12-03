import { Module } from '@nestjs/common';

import { AdminMcController } from './admin-mc.controller';

import { McModule } from '@/models/mc/mc.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [McModule, UtilityModule],
  controllers: [AdminMcController],
})
export class AdminMcModule {}
