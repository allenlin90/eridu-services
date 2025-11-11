import { Module } from '@nestjs/common';

import { McModule } from '@/models/mc/mc.module';
import { UtilityModule } from '@/utility/utility.module';

import { AdminMcController } from './admin-mc.controller';

@Module({
  imports: [McModule, UtilityModule],
  controllers: [AdminMcController],
})
export class AdminMcModule {}
