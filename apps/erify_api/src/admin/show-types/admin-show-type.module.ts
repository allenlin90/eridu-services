import { Module } from '@nestjs/common';

import { ShowTypeModule } from '../../show-type/show-type.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowTypeController } from './admin-show-type.controller';
import { AdminShowTypeService } from './admin-show-type.service';

@Module({
  imports: [ShowTypeModule, UtilityModule],
  controllers: [AdminShowTypeController],
  providers: [AdminShowTypeService],
  exports: [AdminShowTypeService],
})
export class AdminShowTypeModule {}
