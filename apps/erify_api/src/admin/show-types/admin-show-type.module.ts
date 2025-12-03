import { Module } from '@nestjs/common';

import { AdminShowTypeController } from './admin-show-type.controller';

import { ShowTypeModule } from '@/models/show-type/show-type.module';
import { UtilityModule } from '@/utility/utility.module';

@Module({
  imports: [ShowTypeModule, UtilityModule],
  controllers: [AdminShowTypeController],
})
export class AdminShowTypeModule {}
