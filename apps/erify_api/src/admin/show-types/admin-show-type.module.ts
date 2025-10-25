import { Module } from '@nestjs/common';

import { ShowTypeModule } from '../../show-type/show-type.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowTypeController } from './admin-show-type.controller';

@Module({
  imports: [ShowTypeModule, UtilityModule],
  controllers: [AdminShowTypeController],
})
export class AdminShowTypeModule {}
