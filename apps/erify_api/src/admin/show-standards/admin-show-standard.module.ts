import { Module } from '@nestjs/common';

import { ShowStandardModule } from '../../show-standard/show-standard.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowStandardController } from './admin-show-standard.controller';

@Module({
  imports: [ShowStandardModule, UtilityModule],
  controllers: [AdminShowStandardController],
})
export class AdminShowStandardModule {}
