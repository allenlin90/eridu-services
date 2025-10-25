import { Module } from '@nestjs/common';

import { ShowModule } from '../../show/show.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowController } from './admin-show.controller';

@Module({
  imports: [ShowModule, UtilityModule],
  controllers: [AdminShowController],
})
export class AdminShowModule {}
