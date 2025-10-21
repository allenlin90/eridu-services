import { Module } from '@nestjs/common';

import { ShowStandardModule } from '../../show-standard/show-standard.module';
import { UtilityModule } from '../../utility/utility.module';
import { AdminShowStandardController } from './admin-show-standard.controller';
import { AdminShowStandardService } from './admin-show-standard.service';

@Module({
  imports: [ShowStandardModule, UtilityModule],
  controllers: [AdminShowStandardController],
  providers: [AdminShowStandardService],
  exports: [AdminShowStandardService],
})
export class AdminShowStandardModule {}
